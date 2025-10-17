// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PotatoPatch
 * @notice A potato farming game with tiered USDC bonus rewards
 * @dev Demo contract for Base Sepolia testnet - NFA
 */
contract PotatoPatch is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    enum PlotState {
        Empty,
        Planted,
        Harvested
    }

    enum BonusTier {
        None,
        Good,
        Perfect
    }

    struct Plot {
        address owner;
        uint256 plantTime;
        uint256 readyAt;
        PlotState state;
    }

    // Token and timing configuration
    IERC20 public immutable usdcToken;
    uint256 public plantCost; // Cost to plant in token units
    uint256 public growSeconds; // Time until ready to harvest
    uint256 public harvestWindowSeconds; // Grace period before rotten

    // Bonus configuration
    uint256 public bonusBpsPerfect; // Basis points for Perfect tier (10000 = +100%)
    uint256 public bonusBpsGood; // Basis points for Good tier (5000 = +50%)
    uint256 public tierPerfectSeconds; // Timing window for Perfect (±2s)
    uint256 public tierGoodSeconds; // Timing window for Good (±5s)

    // Safety caps
    uint256 public maxBonusPerTx;
    uint256 public maxBonusPerAddressDaily;
    uint256 public maxBonusGlobal;

    // Spender wallet (backend that executes Spend Permissions)
    address public spender;

    // State tracking
    mapping(address => mapping(uint256 => Plot)) public plots; // user => plotId => Plot
    mapping(address => uint256) public lastBonusResetDay; // Track daily reset
    mapping(address => uint256) public dailyBonusReceived; // Track daily bonuses
    uint256 public totalBonusPaid; // Global bonus counter
    uint256 public treasuryBalance; // Available bonus funds

    // ============ Events ============

    event Planted(
        address indexed user,
        uint256 indexed plotId,
        uint256 readyAt
    );
    event Harvested(
        address indexed user,
        uint256 indexed plotId,
        BonusTier tier,
        uint256 bonusPaid,
        uint256 totalPayout
    );
    event TreasuryDeposited(
        address indexed from,
        uint256 amount,
        uint256 newBalance
    );
    event SpenderUpdated(
        address indexed oldSpender,
        address indexed newSpender
    );
    event ConfigUpdated(string param, uint256 value);

    // ============ Constructor ============

    constructor(
        address _usdcToken,
        uint256 _plantCost,
        uint256 _growSeconds,
        uint256 _harvestWindowSeconds,
        uint256 _bonusBpsPerfect,
        uint256 _bonusBpsGood,
        uint256 _tierPerfectSeconds,
        uint256 _tierGoodSeconds,
        uint256 _maxBonusPerTx,
        uint256 _maxBonusPerAddressDaily,
        uint256 _maxBonusGlobal,
        address _spender
    ) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid token address");
        require(_spender != address(0), "Invalid spender address");

        usdcToken = IERC20(_usdcToken);
        plantCost = _plantCost;
        growSeconds = _growSeconds;
        harvestWindowSeconds = _harvestWindowSeconds;
        bonusBpsPerfect = _bonusBpsPerfect;
        bonusBpsGood = _bonusBpsGood;
        tierPerfectSeconds = _tierPerfectSeconds;
        tierGoodSeconds = _tierGoodSeconds;
        maxBonusPerTx = _maxBonusPerTx;
        maxBonusPerAddressDaily = _maxBonusPerAddressDaily;
        maxBonusGlobal = _maxBonusGlobal;
        spender = _spender;
    }

    // ============ Modifiers ============

    modifier onlySpender() {
        require(msg.sender == spender, "Only spender can call");
        _;
    }

    // ============ Core Functions ============

    /**
     * @notice Deposit USDC for planting
     * @dev Sub Account compatible: transferFrom happens here with Auto Spend Permission
     * @param amount Amount of USDC to deposit
     */
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        userBalance[msg.sender] += amount;

        emit UserDeposited(msg.sender, amount, userBalance[msg.sender]);
    }

    /**
     * @notice Plant a potato in a specific plot
     * @dev No transferFrom - uses pre-deposited balance (Sub Account friendly!)
     * @param plotId The plot number (0-8 for 3x3 grid)
     */
    function plant(uint256 plotId) external nonReentrant {
        require(plotId < 9, "Invalid plot ID");
        Plot storage plot = plots[msg.sender][plotId];
        require(
            plot.state == PlotState.Empty || plot.state == PlotState.Harvested,
            "Plot not empty"
        );

        // Use deposited balance instead of transferFrom (Sub Account compatible!)
        require(
            userBalance[msg.sender] >= plantCost,
            "Insufficient deposited balance - deposit first"
        );
        userBalance[msg.sender] -= plantCost;

        // Initialize plot
        uint256 readyAt = block.timestamp + growSeconds;
        plot.owner = msg.sender;
        plot.plantTime = block.timestamp;
        plot.readyAt = readyAt;
        plot.state = PlotState.Planted;

        emit Planted(msg.sender, plotId, readyAt);
    }

    /**
     * @notice Harvest a ripe potato for a user (Spender-only)
     * @dev Called by backend, which will send the payout to user
     * @param user The user to harvest for
     * @param plotId The plot number to harvest
     * @return tier The bonus tier achieved
     * @return bonusPaid The bonus amount from treasury
     * @return totalPayout The total amount to send to user
     */
    function harvestFor(
        address user,
        uint256 plotId
    )
        external
        onlySpender
        nonReentrant
        returns (BonusTier tier, uint256 bonusPaid, uint256 totalPayout)
    {
        require(plotId < 9, "Invalid plot ID");
        Plot storage plot = plots[user][plotId];
        require(plot.state == PlotState.Planted, "Plot not planted");
        require(plot.owner == user, "Not plot owner");

        // Prevent same-block plant+harvest exploit
        require(block.timestamp > plot.plantTime, "Cannot harvest same block");

        // Check if harvest window has passed (rotten)
        uint256 rottenAt = plot.readyAt + harvestWindowSeconds;
        bool isRotten = block.timestamp > rottenAt;

        // Calculate timing and tier
        tier = BonusTier.None;
        bonusPaid = 0;
        totalPayout = 0;

        if (!isRotten && block.timestamp >= plot.readyAt) {
            // Calculate time difference from perfect harvest time
            uint256 timeDiff = block.timestamp > plot.readyAt
                ? block.timestamp - plot.readyAt
                : plot.readyAt - block.timestamp;

            // Determine tier
            if (timeDiff <= tierPerfectSeconds) {
                tier = BonusTier.Perfect;
                bonusPaid = (plantCost * bonusBpsPerfect) / 10000;
            } else if (timeDiff <= tierGoodSeconds) {
                tier = BonusTier.Good;
                bonusPaid = (plantCost * bonusBpsGood) / 10000;
            }

            // Apply safety caps
            bonusPaid = _applySafetyCaps(user, bonusPaid);

            // Check treasury balance
            if (bonusPaid > treasuryBalance) {
                bonusPaid = 0; // Insufficient treasury
            }

            // Refund plant cost + bonus
            totalPayout = plantCost + bonusPaid;

            // Update tracking
            if (bonusPaid > 0) {
                _updateDailyBonus(user, bonusPaid);
                treasuryBalance -= bonusPaid;
                totalBonusPaid += bonusPaid;
            }
        } else {
            // Late harvest - no refund, no bonus
            totalPayout = 0;
        }

        // Reset plot state
        plot.state = PlotState.Harvested;

        // Note: Backend will send the payout to user
        // We don't transfer here, just return the amounts

        emit Harvested(user, plotId, tier, bonusPaid, totalPayout);

        return (tier, bonusPaid, totalPayout);
    }

    /**
     * @notice Deposit tokens into the treasury for bonus rewards
     * @param amount Amount of tokens to deposit
     */
    function depositTreasury(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        treasuryBalance += amount;

        emit TreasuryDeposited(msg.sender, amount, treasuryBalance);
    }

    // ============ Internal Functions ============

    function _applySafetyCaps(
        address user,
        uint256 bonusAmount
    ) internal view returns (uint256) {
        // Cap per transaction
        if (bonusAmount > maxBonusPerTx) {
            bonusAmount = maxBonusPerTx;
        }

        // Cap daily per address
        uint256 currentDay = block.timestamp / 1 days;
        uint256 userLastDay = lastBonusResetDay[user];
        uint256 userDailyTotal = userLastDay == currentDay
            ? dailyBonusReceived[user]
            : 0;

        if (userDailyTotal + bonusAmount > maxBonusPerAddressDaily) {
            bonusAmount = maxBonusPerAddressDaily > userDailyTotal
                ? maxBonusPerAddressDaily - userDailyTotal
                : 0;
        }

        // Cap global bonus
        if (totalBonusPaid + bonusAmount > maxBonusGlobal) {
            bonusAmount = maxBonusGlobal > totalBonusPaid
                ? maxBonusGlobal - totalBonusPaid
                : 0;
        }

        return bonusAmount;
    }

    function _updateDailyBonus(address user, uint256 amount) internal {
        uint256 currentDay = block.timestamp / 1 days;

        if (lastBonusResetDay[user] != currentDay) {
            lastBonusResetDay[user] = currentDay;
            dailyBonusReceived[user] = amount;
        } else {
            dailyBonusReceived[user] += amount;
        }
    }

    // ============ View Functions ============

    function getPlot(
        address user,
        uint256 plotId
    ) external view returns (Plot memory) {
        return plots[user][plotId];
    }

    function getUserPlots(address user) external view returns (Plot[9] memory) {
        Plot[9] memory userPlots;
        for (uint256 i = 0; i < 9; i++) {
            userPlots[i] = plots[user][i];
        }
        return userPlots;
    }

    function getTreasuryBalance() external view returns (uint256) {
        return treasuryBalance;
    }

    function getSpender() external view returns (address) {
        return spender;
    }

    function getUserDailyBonus(address user) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        return
            lastBonusResetDay[user] == currentDay
                ? dailyBonusReceived[user]
                : 0;
    }

    function getConfig()
        external
        view
        returns (
            uint256 _plantCost,
            uint256 _growSeconds,
            uint256 _harvestWindowSeconds,
            uint256 _bonusBpsPerfect,
            uint256 _bonusBpsGood,
            uint256 _tierPerfectSeconds,
            uint256 _tierGoodSeconds
        )
    {
        return (
            plantCost,
            growSeconds,
            harvestWindowSeconds,
            bonusBpsPerfect,
            bonusBpsGood,
            tierPerfectSeconds,
            tierGoodSeconds
        );
    }

    // ============ Admin Functions ============

    function setSpender(address _spender) external onlyOwner {
        require(_spender != address(0), "Invalid spender address");
        address oldSpender = spender;
        spender = _spender;
        emit SpenderUpdated(oldSpender, _spender);
    }

    function updatePlantCost(uint256 _plantCost) external onlyOwner {
        plantCost = _plantCost;
        emit ConfigUpdated("plantCost", _plantCost);
    }

    function updateGrowSeconds(uint256 _growSeconds) external onlyOwner {
        growSeconds = _growSeconds;
        emit ConfigUpdated("growSeconds", _growSeconds);
    }

    function updateHarvestWindow(
        uint256 _harvestWindowSeconds
    ) external onlyOwner {
        harvestWindowSeconds = _harvestWindowSeconds;
        emit ConfigUpdated("harvestWindowSeconds", _harvestWindowSeconds);
    }

    function updateBonusConfig(
        uint256 _bonusBpsPerfect,
        uint256 _bonusBpsGood,
        uint256 _tierPerfectSeconds,
        uint256 _tierGoodSeconds
    ) external onlyOwner {
        bonusBpsPerfect = _bonusBpsPerfect;
        bonusBpsGood = _bonusBpsGood;
        tierPerfectSeconds = _tierPerfectSeconds;
        tierGoodSeconds = _tierGoodSeconds;
        emit ConfigUpdated("bonusConfig", 1);
    }

    function updateSafetyCaps(
        uint256 _maxBonusPerTx,
        uint256 _maxBonusPerAddressDaily,
        uint256 _maxBonusGlobal
    ) external onlyOwner {
        maxBonusPerTx = _maxBonusPerTx;
        maxBonusPerAddressDaily = _maxBonusPerAddressDaily;
        maxBonusGlobal = _maxBonusGlobal;
        emit ConfigUpdated("safetyCaps", 1);
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdcToken.balanceOf(address(this));
        usdcToken.safeTransfer(owner(), balance);
        treasuryBalance = 0;
    }
}
