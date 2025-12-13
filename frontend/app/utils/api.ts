import { MOCK_DATA } from "@/lib/mocks";
import { MatchData } from "@/types/matchs";

export const fetchMatchData = async (matchId: string): Promise<MatchData> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const selectedMatch: MatchData =
        MOCK_DATA["2"] ?? MOCK_DATA["1"];

    return selectedMatch;
};
