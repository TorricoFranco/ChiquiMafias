"use client";

import React from "react";
import { PollOptions } from "../PollOptions";
import { VersusBody } from "./VersusBody";
import { MatchBody } from "./MatchBody";
import { FactoBody } from "./FactoBody";
import { RatingBody } from "./RatingBody";
import { RankingBody } from "./RankingBody";
import { PollBodyProps } from "./types";

/**
 * Cuerpo de la encuesta según su tipo. `PollOptions` es el cuerpo clásico y
 * también el de las noticias, que se votan igual pero con piel de placa; un
 * tipo que este front todavía no conoce cae ahí en vez de romper el feed.
 */
export const PollBody: React.FC<PollBodyProps> = ({ poll, onVoteUpdate }) => {
    switch (poll.type) {
        case "VERSUS":
            return <VersusBody poll={poll} onVoteUpdate={onVoteUpdate} />;
        case "MATCH":
            return <MatchBody poll={poll} onVoteUpdate={onVoteUpdate} />;
        case "FACTO":
            return <FactoBody poll={poll} onVoteUpdate={onVoteUpdate} />;
        case "RATING":
            return <RatingBody poll={poll} onVoteUpdate={onVoteUpdate} />;
        case "RANKING":
            return <RankingBody poll={poll} onVoteUpdate={onVoteUpdate} />;
        default:
            return <PollOptions poll={poll} onVoteUpdate={onVoteUpdate} />;
    }
};
