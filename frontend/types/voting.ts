interface Option {
  id: number;
  label: string;
  votes: number;
}

export interface PollData {
  id: string;
  title: string;
  description: string;
  options: Option[];
  status: string;
  icon: string;
}