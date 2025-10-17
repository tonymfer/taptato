import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { USDC, erc20Abi } from "@/lib/usdc";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ExternalLink, Heart, Repeat2, Send, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { encodeFunctionData, formatUnits, isAddress, parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatDate } from "../lib/utils";

export interface Post {
  id: string;
  author: {
    name: string;
    display_name: string;
    username: string;
    pfp_url: string;
    power_badge: boolean;
    custody_address: `0x${string}`;
    verified_addresses: {
      eth_addresses: `0x${string}`[];
      sol_addresses: string[];
    };
  };
  embeds: {
    metadata: {
      content_type: string;
    };
    url: string;
  }[];
  text: string;
  timestamp: string;
  reactions: {
    likes_count: number;
    recasts_count: number;
  };
  replies: {
    count: number;
  };
}

interface PostsResponse {
  posts: Post[];
  nextCursor: string | null;
}

const fetchPosts = async ({
  pageParam,
}: {
  pageParam?: string;
}): Promise<PostsResponse> => {
  const url = pageParam ? `/api/posts?cursor=${pageParam}` : "/api/posts";

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch posts");
  }
  return response.json();
};

export default function Posts({ onTipSuccess }: { onTipSuccess: () => void }) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });

  // Shared transaction state across all posts to prevent concurrent tipping
  const {
    sendTransaction,
    data: hash,
    isPending: isTransactionPending,
    reset: resetTransaction,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  // Track which post is currently being tipped
  const [tippingPostId, setTippingPostId] = useState<string | null>(null);

  // Intersection observer for infinite scroll
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return <div className="text-center py-8">Loading posts...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">Error loading posts</div>
    );
  }

  // Flatten all pages and filter posts to only show those with valid eth addresses
  const allPosts = data?.pages.flatMap((page) => page.posts) || [];
  const postsWithValidAddresses = allPosts.filter(
    (post: Post) =>
      post.author.verified_addresses.eth_addresses &&
      post.author.verified_addresses.eth_addresses.length > 0 &&
      isAddress(post.author.verified_addresses.eth_addresses[0])
  );

  return (
    <div className="space-y-4">
      {postsWithValidAddresses.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onTipSuccess={onTipSuccess}
          sendTransaction={sendTransaction}
          isTransactionPending={isTransactionPending}
          isConfirming={isConfirming}
          isConfirmed={isConfirmed}
          resetTransaction={resetTransaction}
          tippingPostId={tippingPostId}
          setTippingPostId={setTippingPostId}
        />
      ))}

      {/* Intersection observer target */}
      <div ref={observerTarget} className="py-4">
        {isFetchingNextPage && (
          <div className="flex justify-center items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more posts...</span>
          </div>
        )}
        {!hasNextPage && postsWithValidAddresses.length > 0 && (
          <div className="text-center text-muted-foreground text-sm">
            No more posts to load
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({
  post,
  onTipSuccess,
  sendTransaction,
  isTransactionPending,
  isConfirming,
  isConfirmed,
  resetTransaction,
  tippingPostId,
  setTippingPostId,
}: {
  post: Post;
  onTipSuccess: () => void;
  sendTransaction: ReturnType<typeof useSendTransaction>["sendTransaction"];
  isTransactionPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  resetTransaction: () => void;
  tippingPostId: string | null;
  setTippingPostId: (id: string | null) => void;
}) {
  const account = useAccount();
  const { data: balance } = useBalance({
    address: account.address,
    token: USDC.address,
  });
  const [toastId, setToastId] = useState<string | number | null>(null);
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check if this specific post is the one being tipped
  const isThisPostTipping = tippingPostId === post.id;

  const handleTip = useCallback(async () => {
    setTippingPostId(post.id);

    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: [
        post.author.verified_addresses.eth_addresses[0],
        parseUnits("0.10", USDC.decimals),
      ],
    });

    sendTransaction({
      to: USDC.address,
      data,
      value: 0n,
    });

    const toastId_ = toast("Sending tip...", {
      description: `Tipping @${post.author.username} with 0.10 USDC`,
      duration: Infinity,
    });

    setToastId(toastId_);
  }, [post.author, post.id, sendTransaction, setTippingPostId]);

  const handleCustomTip = useCallback(async () => {
    if (
      !customTipAmount ||
      !isAddress(post.author.verified_addresses.eth_addresses[0])
    )
      return;

    try {
      setTippingPostId(post.id);

      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          post.author.verified_addresses.eth_addresses[0],
          parseUnits(customTipAmount, USDC.decimals),
        ],
      });

      sendTransaction({
        to: USDC.address,
        data,
        value: 0n,
      });

      const toastId_ = toast("Sending custom tip...", {
        description: `Tipping @${post.author.username} with ${customTipAmount} USDC`,
        duration: Infinity,
      });

      setToastId(toastId_);
      setIsDialogOpen(false);
      setCustomTipAmount("");
    } catch (_error) {
      toast.error("Invalid tip amount", {
        description: "Please enter a valid USDC amount",
      });
    }
  }, [
    customTipAmount,
    post.author,
    post.id,
    sendTransaction,
    setTippingPostId,
  ]);

  const handlePercentageClick = useCallback(
    (percentage: number) => {
      if (!balance?.value) return;
      const amount = (
        Number(formatUnits(balance.value, USDC.decimals)) * percentage
      ).toFixed(2);
      setCustomTipAmount(amount);
    },
    [balance]
  );

  useEffect(() => {
    if (isConfirmed && toastId !== null && isThisPostTipping) {
      toast.success("Tip sent successfully!", {
        description: `You tipped @${post.author.username} with ${customTipAmount || "0.10"} USDC`,
        duration: 2000,
      });

      setTimeout(() => {
        toast.dismiss(toastId);
      }, 0);

      setToastId(null);
      setTippingPostId(null);
      resetTransaction();
      onTipSuccess();
    }
  }, [
    isConfirmed,
    toastId,
    post.author,
    resetTransaction,
    onTipSuccess,
    customTipAmount,
    isThisPostTipping,
    setTippingPostId,
  ]);

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={post.author.pfp_url}
              alt={post.author.display_name}
            />
            <AvatarFallback>
              {post.author.display_name.substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{post.author.display_name}</div>
            <div className="text-sm text-muted-foreground">
              @{post.author.username} · {formatDate(post.timestamp)}
            </div>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
          <a
            href={`https://warpcast.com/~/conversations/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="mb-3 whitespace-pre-wrap">{post.text}</div>

      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <span>{post.reactions.likes_count}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Repeat2 className="h-4 w-4 text-muted-foreground" />
            <span>{post.reactions.recasts_count}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={!account.address || isConfirming || isTransactionPending}
            onClick={handleTip}
            title={
              isTransactionPending || isConfirming
                ? isThisPostTipping
                  ? "Sending tip..."
                  : "A tip is already being sent"
                : undefined
            }
          >
            <Send className="h-4 w-4" />
            <span>
              {isThisPostTipping && (isTransactionPending || isConfirming)
                ? "Tipping..."
                : "Tip 0.10 USDC"}
            </span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={
                  !account.address || isConfirming || isTransactionPending
                }
                title={
                  isTransactionPending || isConfirming
                    ? isThisPostTipping
                      ? "Sending tip..."
                      : "A tip is already being sent"
                    : undefined
                }
              >
                <Send className="h-4 w-4" />
                <span>Custom Tip</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Custom Tip (USDC)</DialogTitle>
                <DialogDescription>
                  Enter the amount of USDC you want to tip @
                  {post.author.username}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-sm text-muted-foreground">
                    Your Balance{" "}
                    <a
                      href="https://faucet.circle.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:opacity-80"
                    >
                      Get USDC
                    </a>
                  </div>
                  <div className="text-xl font-medium">
                    {balance
                      ? `${Number(formatUnits(balance.value, USDC.decimals)).toFixed(2)} USDC`
                      : "Loading..."}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePercentageClick(0.1)}
                    disabled={!balance}
                  >
                    10%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePercentageClick(0.2)}
                    disabled={!balance}
                  >
                    20%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePercentageClick(0.5)}
                    disabled={!balance}
                  >
                    50%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePercentageClick(1)}
                    disabled={!balance}
                  >
                    100%
                  </Button>
                </div>
                <Input
                  type="number"
                  placeholder="0.0"
                  step="0.01"
                  min="0"
                  value={customTipAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCustomTipAmount(e.target.value)
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCustomTip}
                  disabled={
                    !customTipAmount || isConfirming || isTransactionPending
                  }
                >
                  Send Tip
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
