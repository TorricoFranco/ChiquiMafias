"use client";
import { AnnualRow } from "@/lib/mocks";
import Badge from "@/components/ui/Badge";

export const getQualificationBadge = (qualification: AnnualRow['qualification']) => {
    if (!qualification) return null;
    switch (qualification) {
        case 'libertadores_group':
            return <Badge variant="libertadores_group" />;
        case 'libertadores_qualifier':
            return <Badge variant="libertadores_qualifier" />;
        case 'sudamericana':
            return <Badge variant="sudamericana" />;
        default:
            return null;
    }
}