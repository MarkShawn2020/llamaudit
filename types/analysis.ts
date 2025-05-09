export interface IKeyDecisionItem {
    categoryType: string;
    details: string;
    amount: string;
    departments: string[];
    personnel: string[];
    decisionBasis: string;
    originalText: string;
}

export interface IMeeting {
    meetingDate: string;
    documentNo: string;
    meetingTopic: string;
    conclusion: string;
    summary: string;
    documentName: string;
    isTripleOneMeeting: boolean;
    keyDecisionItems: IKeyDecisionItem[];
}