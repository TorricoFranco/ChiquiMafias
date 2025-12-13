"use client";
import { PromedioRow, AnnualRow } from "@/lib/mocks";
import Badge from "@/components/ui/Badge";

export type RelegationFlag = PromedioRow['relegation_flag'] | AnnualRow['relegation_flag'];

export const getRelegationBadge = (flag: RelegationFlag) => {
    if (!flag) return null;
    switch (flag) {
        case 'descenso_directo':
            return <Badge variant="descenso_directo" />;
        case 'promocion':
            return <Badge variant="promocion" />;
        default:
            return null;
    }
}