/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  streak: number;
  totalScore: number;
  daysCompleted: number;
  lastSubmissionDate: string | null;
  joinedAt: string;
}

export interface DailyCurriculum {
  day: number;
  title: string;
  reading: string;
  example: string;
  assignmentPrompt: string;
}

export interface SubmissionItem {
  id: string;
  userId: string;
  day: number;
  title: string;
  submittedAt: string;
  submissionText: string;
  aiScore: number;
  aiCritique: string;
  dailyScore: number;
}

export interface CustomLeaderboardEntry {
  id: string;
  name: string;
  streak: number;
  totalScore: number;
  daysCompleted: number;
  isCurrentUser?: boolean;
}
