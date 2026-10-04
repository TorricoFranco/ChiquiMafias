
export interface PollOption {
  id: number;
  label: string;
  votes: number;
}

export type PollStatus = 'PENDING' | 'ACTIVE' | 'CLOSED' | 'REJECTED';

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  options: PollOption[];
  status: PollStatus;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  icon: string;
  userId?: string | null;
  user?: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  userVotedOptionId?: number | null;
  likesCount?: number;
  dislikesCount?: number;
  userReaction?: ReactionType | null;

  stats?: {
    comments: number;
    reactions: number;
  };
}
export interface CommentUser {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface Comment {
  id: string;
  pollId: string;
  userId: string;
  text: string;
  createdAt: string;
  user: CommentUser;
  likesCount?: number;
  dislikesCount?: number;
  userReaction?: ReactionType | null;
  isPremium: boolean;
}

export interface ActivePollMessage {
  id: string;
  title: string;
  timestamp: number;
}


export interface PaginatedComments {
  data: Comment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

export interface PaginatedPolls {
  data: Poll[];
  meta: {
    total: number;
    page: number;
    limit: number;
    lastPage: number;
  };
}

export type ReactionType = 'LIKE' | 'DISLIKE';


export interface ProposePollDto {
  title: string;
  description?: string;
  options: string[];
  icon?: string;
}

export interface ApprovePollDto {
  startsAt: string;
  endsAt: string;
}

export interface CreateCommentDto {
  text: string;
}

export interface ReactDto {
  type: ReactionType;
}


export interface AdminPollItem {
  id: string;
  title: string;
  description?: string | null;
  options: PollOption[];
  status: PollStatus;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  icon: string;
  userId?: string | null;
  user?: {
    id: string;
    username: string;
  } | null;
  totalVotes?: number;
  likesCount?: number;
  dislikesCount?: number;
  stats?: {
    comments: number;
    reactions: number;
  };
}