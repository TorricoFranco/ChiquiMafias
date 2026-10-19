export interface CompleteProfileDto {
    username: string;
    teamId: string;
    acceptTerms: boolean;
}

export interface AcceptTermsResponse {
    termsAcceptedAt: string;
    termsVersion: string;
}