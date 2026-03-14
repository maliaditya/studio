

import { z } from 'zod';

export type ExerciseCategory = 
  | "Chest" 
  | "Triceps" 
  | "Shoulders" 
  | "Legs" 
  | "Back" 
  | "Biceps" 
  | "Core" 
  | "Full Body"
  | "Content Bundle"
  | "Lead Generation"
  | "Desire"
  | "Thought"
  | "Other";

export const exerciseCategories: ExerciseCategory[] = [
  "Chest", 
  "Triceps", 
  "Shoulders", 
  "Legs", 
  "Back", 
  "Biceps", 
  "Core", 
  "Full Body", 
  "Other"
];

export interface LoggedSet {
  id: string;
  reps: number;
  weight: number;
  timestamp: number;
}

export interface SharingStatus {
  twitter?: boolean;
  linkedin?: boolean;
  devto?: boolean;
  youtube?: boolean;
}

export interface DecompositionRow {
  technique: string;
  description: string;
  useCases: string;
}

export type NodeType = 'Intention' | 'Objective' | 'Action' | 'Standalone' | 'Curiosity' | 'Visualization';


export interface ExerciseDefinition {
  id: string;
  name: string; // Subtopic for upskill
  category: ExerciseCategory; // Topic for upskill
  description?: string;
  completed?: boolean;
  link?: string;
  iconUrl?: string;
  estimatedDuration?: number; // Total minutes
  loggedDuration?: number; // Total minutes logged for this specific task
  last_logged_date?: string; // New field: yyyy-MM-dd
  decompositionData?: { id: string; text: string, type: 'text' }[];
  focusAreaIds?: string[];
  sourceUpskillId?: string;
  linkedUpskillIds?: string[];
  linkedDeepWorkIds?: string[];
  linkedResourceIds?: string[];
  isReadyForBranding?: boolean;
  linkedProjectIds?: string[];
  primaryProjectId?: string | null;
  linkedMicroSkillIds?: string[];
  nodeType?: NodeType;
  // Personal Branding
  brandingStatus?: 'converted' | 'published';
  contentUrls?: {
    blog?: string;
    youtube?: string;
    demo?: string;
  };
  sharingStatus?: SharingStatus;
  resourceCards?: { name: string, type: 'Elements' | 'Tools' | 'Patterns', points: { text: string }[] }[];
  habitEquationIds?: string[];
}

export interface TopicGoal {
  goalType: 'pages' | 'hours';
  goalValue: number;
}

export interface TopicBrandingInfo {
  brandingStatus?: 'converted' | 'published';
  contentUrls?: {
    blog?: string;
    youtube?: string;
    demo?: string;
  };
  sharingStatus?: SharingStatus;
}

export interface WorkoutExercise {
  id: string; // Unique instance ID for this exercise in this workout
  definitionId: string; // Links to ExerciseDefinition
  name: string; // Copied from definition for display convenience
  category: ExerciseCategory; // Copied from definition
  description?: string;
  loggedSets: LoggedSet[];
  targetSets: number;
  targetReps: string; // e.g., "8-12"
  focusAreaIds?: string[];
  lastPerformance?: {
    reps: number;
    weight: number;
  } | null;
  sharingStatus?: SharingStatus;
}

export interface DatedWorkout {
  id: string; // Unique ID for this workout log, typically the date string 'yyyy-MM-dd'
  date: string; // Date string in 'yyyy-MM-dd' format
  exercises: WorkoutExercise[];
  notes?: string; // Optional notes for the workout
}

export interface LocalUser {
  username: string;
}

export type WorkoutMode = 'one-muscle' | 'two-muscle';
export type StrengthTrainingMode = 'resistance' | 'calisthenics';
export type Gender = 'male' | 'female';
export type WorkoutSchedulingMode = 'day-of-week' | 'sequential';

export type WorkoutPlan = Partial<Record<ExerciseCategory, string[]>>;
export type AllWorkoutPlans = Record<string, WorkoutPlan>;

export interface WeightLog {
  date: string; // ISO week format 'YYYY-WW'
  weight: number;
}

export interface MealItem {
  id: string;
  quantity: string;
  content: string;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  calories: number | null;
}

export interface EditableMealPlan {
  day: string;
  meal1: MealItem[];
  meal2: MealItem[];
  meal3: MealItem[];
  supplements: MealItem[];
  // The daily totals are now derived values, but can be kept for caching/display
  totalCalories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
}

export type UserDietPlan = EditableMealPlan[];

export type ActivityType = 'workout' | 'upskill' | 'deepwork' | 'planning' | 'tracking' | 'branding' | 'lead-generation' | 'interrupt' | 'essentials' | 'nutrition' | 'mindset' | 'distraction' | 'spaced-repetition' | 'pomodoro' | 'bugs';

export interface PauseEvent {
  pauseTime: number;
  resumeTime: number | null;
}

export interface PostSessionReview {
  resistance: string;
  helpfulTechniqueId: string;
  cortisolLevel: 'low' | 'medium' | 'high';
}

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export type RecurrenceRule = {
  type: 'daily' | 'weekly' | 'custom';
  days?: number; // legacy custom day interval
  repeatInterval?: number;
  repeatUnit?: 'day' | 'week' | 'month';
}

export interface Activity {
  id: string;
  type: ActivityType;
  details: string;
  completed: boolean;
  completedAt?: number;
  taskIds?: string[];
  slot: string;
  habitEquationIds?: string[]; // New field to link rule equations
  focusSessionInitialStartTime?: number;
  focusSessionStartTime?: number; // Tracks start of current segment (or initial start)
  focusSessionEndTime?: number;
  focusSessionPauses?: PauseEvent[]; // Detailed pause tracking
  focusSessionInitialDuration?: number;
  postSessionReview?: PostSessionReview;
  duration?: number; // For interruptions
  subTasks?: SubTask[]; // Added for sub-task functionality
  routine?: RecurrenceRule | null;
  isRoutine?: boolean;
  baseDate?: string;
  linkedEntityType?: 'specialization' | 'intention' | 'curiosity';
  linkedActivityType?: ActivityType;
};

export interface Interrupt {
  id: string;
  text: string;
  duration: number; // in minutes
}

export type SlotName = 'Late Night' | 'Dawn' | 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface DailySchedule {
  [slotName: string]: Activity[] | string | Interrupt[] | undefined;
}

export type FullSchedule = Record<string, DailySchedule>; // Date key -> DailySchedule

export interface Release {
  id: string;
  name: string;
  description: string;
  launchDate: string; // yyyy-MM-dd format
  focusAreaIds: string[];
  workflowStageChecklistItems?: never;
  workflowStages?: {
    botheringPointId?: string | null;
    botheringText?: string;
    stageLabels?: {
      idea: string;
      code: string;
      break: string;
      fix: string;
    };
    ideaItems: Array<string | WorkflowStageCard>;
    codeItems: Array<string | WorkflowStageCard>;
    breakItems: Array<string | WorkflowStageCard>;
    fixItems: Array<string | WorkflowStageCard>;
  };
  features?: string[];
  daysRemaining?: number;
  availableHours?: number;
  totalAvailableHours?: number;
  totalLoggedHours?: number;
  totalEstimatedHours?: number;
  githubLink?: string;
  demoLink?: string;
  addToPortfolio?: boolean;
}

export interface WorkflowStageChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
}

export interface WorkflowStageCard {
  text: string;
  completed?: boolean;
  description?: string;
  labels?: string[];
  dueDate?: string | null;
  checklist?: WorkflowStageChecklistItem[];
  linkedIntentionIds?: string[];
}

export interface KanbanChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  linkedIntentionId?: string;
}

export interface KanbanComment {
  id: string;
  cardId: string;
  body: string;
  createdAt: string;
}

export interface KanbanAttachment {
  id: string;
  cardId: string;
  name: string;
  url: string;
  type?: string;
}

export interface KanbanLabel {
  id: string;
  boardId: string;
  title: string;
  color: string;
}

export interface KanbanCard {
  id: string;
  boardId: string;
  listId: string;
  cardKind?: 'standard' | 'bug';
  title: string;
  description: string;
  labelIds: string[];
  dueDate?: string | null;
  checklist: KanbanChecklistItem[];
  attachmentIds: string[];
  commentIds: string[];
  linkedIntentionIds: string[];
  workflowStageKey?: 'idea' | 'code' | 'break' | 'fix' | null;
  parentCardId?: string | null;
  linkedBugIntentionId?: string | null;
  parentIntentionWasCompleted?: boolean;
  resolvedAt?: string | null;
  linkedProjectId?: string | null;
  linkedReleaseId?: string | null;
  linkedResourceId?: string | null;
  linkedFeatureResourceId?: string | null;
  linkedFeaturePointId?: string | null;
  linkedFeaturePointIds?: string[];
  brandingType?: 'blog' | 'video' | null;
  totalLoggedMinutes?: number;
  archived?: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanList {
  id: string;
  boardId: string;
  title: string;
  color?: string;
  cardOrder: string[];
  position: number;
  archived?: boolean;
}

export interface KanbanBoard {
  id: string;
  name: string;
  description?: string;
  projectId?: string | null;
  releaseId?: string | null;
  specializationId?: string | null;
  createdAt: string;
  updatedAt: string;
  listOrder: string[];
  labels: KanbanLabel[];
  lists: KanbanList[];
  cards: KanbanCard[];
  attachments: KanbanAttachment[];
  comments: KanbanComment[];
  boardType?: 'project' | 'branding';
  migratedFromReleaseWorkflow?: boolean;
}

export interface Offer {
  id: string;
  name: string;
  outcome: string;
  audience: string;
  deliverables: string;
  valueStack: string;
  timeline: string;
  price: string;
  format: string;
}

export interface LearningResourceAudio {
  id: string;
  name: string;
  tutor: string;
  totalItems: number | null;
  totalHours: number | null;
  startDate?: string | null;
  completionDate?: string | null;
}

export interface LearningResourceBook {
  id: string;
  name: string;
  author: string;
  totalPages: number | null;
  startDate?: string | null;
  completionDate?: string | null;
  linkedPdfResourceId?: string | null;
}

export interface LearningPlan {
  audioVideoResources?: LearningResourceAudio[];
  bookWebpageResources?: LearningResourceBook[];
  skillTreePaths?: SkillTreePathPlan[];
}

export interface SkillTreePathPlan {
  id: string;
  name: string;
  skillAreaIds: string[];
  targetMicroSkills: number | null;
  completionDate?: string | null;
  linkedPdfResourceId?: string | null;
}


export interface ProductizationPlan {
  productType?: string;
  offerTypes?: string[];
  gapAnalysis?: GapAnalysis;
  releases?: Release[];
  offers?: Offer[];
  learningPlan?: LearningPlan;
}

export interface GapAnalysis {
  gapTypes: string[];
  whatYouCanFill: string;
  coreSolution: string;
  outcomeGoal: string;
  strainReduction?: string;
}

export interface FormalizationItem {
    id: string;
    text: string;
    properties?: Record<string, string>;
    linkedElementIds?: string[];
    linkedComponentIds?: string[];
    linkedOperationIds?: string[];
    isGlobal?: boolean;
}

export interface FormalizationData {
  elements: FormalizationItem[];
  operations: FormalizationItem[];
  components: FormalizationItem[];
}

export interface ResourcePoint {
  id: string;
  text: string;
  type?:
    | 'text'
    | 'ai-note'
    | 'heading1'
    | 'heading2'
    | 'heading3'
    | 'bulleted-list'
    | 'numbered-list'
    | 'todo'
    | 'youtube'
    | 'obsidian'
    | 'card'
    | 'markdown'
    | 'code'
    | 'link'
    | 'timestamp'
    | 'paint';
  url?: string;
  resourceId?: string; // ID of the linked Resource card
  displayText?: string;
  timestamp?: number; // Start time in seconds for audio/video notes
  endTime?: number; // End time in seconds for audio/video notes
  drawing?: string; // Store drawing data as a data URL
  checked?: boolean;
  readyForBranding?: boolean;
}

export interface Stopper {
    id: string;
    text: string;
    status: 'none' | 'manageable' | 'unmanageable';
    managementStrategy?: string;
    linkedResourceId?: string;
    linkedTechniqueId?: string; // Default/Stage 1
    linkedTechniqueId_stage2?: string; // For 2nd encounter of the day
    linkedTechniqueId_stage3?: string; // For 3rd+ encounter of the day
    timestamps?: number[];
    linkedResistanceIds?: string[]; // New: Link resistances to urges
}

export interface Strength {
    id: string;
    text: string;
}

export interface FlashcardResourceData {
  question: string;
  answer: string;
  options?: string[];
  correctOptionIndex?: number;
  explanation?: string;
  topicIds: string[];
  sessionId: string;
  pageNumber: number;
  sourceHighlightId: string;
  sourceText: string;
  specializationId: string;
  specializationName: string;
  taskKey: string;
  pdfResourceId: string;
  generatedAt: string;
}

export interface Resource {
  id: string;
  name: string;
  folderId: string;
  type: 'link' | 'card' | 'habit' | 'mechanism' | 'model3d' | 'pdf' | 'flashcard';
  createdAt: string;
  isFavorite?: boolean;

  // For 'link' type
  link?: string;
  description?: string;
  iconUrl?: string;
  githubLink?: string;
  demoLink?: string;
  linkedResourceId?: string;
  linkedBrainHackIds?: string[];
  hasLocalAudio?: boolean; // Flag to check IndexedDB
  audioFileName?: string;
  audioUrl?: string;
  hasLocalPdf?: boolean;
  pdfFileName?: string;
  flashcard?: FlashcardResourceData;

  // For 'card' type
  points?: ResourcePoint[];
  icon?: string;

  // For 'habit' type
  trigger?: {
    action?: string;
    feeling?: string;
  };
  response?: {
    text?: string;
    resourceId?: string;
    visualize?: string;
  };
  reward?: string;
  newResponse?: {
    text?: string;
    resourceId?: string;
    action?: string;
    visualize?: string;
  };
  urges?: Stopper[];
  resistances?: Stopper[];
  strengths?: Strength[];
  state?: string;
  linkedBotheringId?: string;
  linkedBotheringType?: 'mismatch' | 'constraint' | 'external';
  
  // For 'mechanism' type
  mechanismFramework?: 'positive' | 'negative';
  benefit?: string;
  law?: {
    premise?: string;
    outcome?: string;
  };
  
  // For 3D Model
  modelUrl?: string;

  formalization?: FormalizationData;
}

export interface ResourceFolder {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string; // Optional: for root folders or special folders
}

export interface PopupState {
  popupId?: string;
  resourceId: string;
  navigationPath?: string[];
  level: number;
  x: number;
  y: number;
  parentId?: string;
  width?: number;
  height?: number;
  z?: number;
}

export type Side = 'top' | 'right' | 'bottom' | 'left';

// Canvas Types
export interface CanvasNode {
  id: string; // This will be the definitionId
  x: number;
  y: number;
  width?: number; // Optional
  height?: number; // Optional
}

export interface CanvasEdge {
  id: string;
  source: string; // definitionId of source node
  target: string; // definitionId of target node
  label?: string;
  fromSide: Side;
  toSide: Side;
}

export interface CanvasLayout {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

// Mindset Types
export interface MindsetCard {
  id: string;
  title: string;
  icon: string;
  points: MindsetPoint[];
}

// Pistons of Intention
export type PistonType = 'Gratitude' | 'Curiosity' | 'Inspiration' | 'Compassion' | 'Truth Seeking';

export interface PistonEntry {
    id: string;
    text: string;
    timestamp: number;
}

export type PistonState = PistonEntry[];

export type PistonsData = Partial<Record<PistonType, PistonState>> & {
    activity?: string;
    linkedResourceIds?: Partial<Record<PistonType, string>>;
    thoughtEntries?: PistonEntry[]; // For negative thoughts
};

export interface PistonsCategoryData {
    health?: PistonsData;
    [topicId: string]: PistonsData | undefined; // For wealth, growth, and desire topics
}

// Skill Page Types
export type PurposePillar =
  | 'Mind' | 'Focus' | 'Learning' | 'Creativity'
  | 'Body' | 'Health' | 'Strength' | 'Energy'
  | 'Heart' | 'Relationships' | 'Emotional Health'
  | 'Spirit' | 'Meaning' | 'Contribution' | 'Legacy';

export interface SkillAcquisitionPlan {
    specializationId: string;
    targetDate: string;
    requiredMoney: number | null;
    requiredHours: number | null;
    linkedRuleEquationIds: string[];
}

export interface AbandonmentLog {
  id: string;
  timestamp: number;
  reason: string;
  handlingStrategy?: string;
  fear?: string;
}

export interface CoreSkill {
  id: string;
  domainId: string;
  name: string;
  type: 'Foundation' | 'Specialization' | 'Professionalism';
  skillAreas: SkillArea[];
  purposePillar?: string;
  parentId?: string | null;
  addToPortfolio?: boolean; // New field
  linkedPdfResourceId?: string | null;
  linkedResourceIds?: string[];
}

export interface SkillArea {
  id: string;
  name: string;
  purpose: string;
  microSkills: MicroSkill[];
}

export interface MicroSkill {
  id: string;
  name: string;
  isReadyForRepetition?: boolean;
  completedItems?: number;
  completedHours?: number;
  completedPages?: number;
}

// Project Skill Linking
export interface ProjectSkillLink {
  featureId: string;
  microSkillId: string;
}

export interface Feature {
  id: string;
  name: string;
  linkedSkills: ProjectSkillLink[];
}

export interface Project {
  id: string;
  name: string;
  domainId: string;
  features: Feature[];
  // Re-purposing these from the old system for product planning
  productType?: string;
  gapAnalysis?: GapAnalysis;
  releases?: Release[];
  purposePillar?: string;
  productPlan?: ProjectPlan; // Added for dedicated product planning
  isReadyForBranding?: boolean;
}

// Professional Experience Types
export interface Company {
    id: string;
    name: string;
}

export interface WorkProject {
    id: string;
    name: string;
    description: string;
    linkedSpecializationId: string; // ID of a CoreSkill with type 'Specialization'
}

export interface Position {
    id: string;
    companyId: string;
    title: string;
    projects: WorkProject[];
}

// Purpose & Patterns Data
export interface PillarCardData {
  id: string;
  principle: string;
  practiceEquationIds: string[];
  applicationSpecializationIds: string[];
  applicationProjectIds: string[];
  outcome: string;
}

export interface ProjectPlan {
  linkedRuleEquationIds: string[];
  targetDate: string;
  requiredMoney: number | null;
  requiredHours: number | null;
  componentProjectIds?: string[];
}

export interface HabitEquation {
  id: string;
  metaRuleIds: string[];
  outcome: string;
  linkedResourceId?: string;
}

export interface PurposeData {
  statement: string;
  specializationPurposes: Record<string, string>; // Key is CoreSkill ID
  pillarCards?: PillarCardData[];
}

// Pattern Recognition Types
export interface PatternPhrase {
  category: string;
  text: string;
  mechanismCardId: string;
  mechanismCardName?: string;
  linkedMechanisms?: string[];
}

export interface Pattern {
  id: string;
  name: string;
  type: 'Positive' | 'Negative';
  patternCategory?: string;
  threatSignalCategory?: string;
  growthSignalCategory?: string;
  sharedCause?: string;
  threatSignal?: string;
  threatAction?: string;
  threatOutcome?: string;
  growthSignal?: string;
  growthAction?: string;
  growthOutcome?: string;
  actionType?: string;
  growthActionType?: string;
  state?: string;
  phrases: PatternPhrase[];
}

export interface MetaRule {
  id: string;
  text: string;
  patternId: string;
  purposePillar?: string;
}

export interface PistonsInitialState {
  view: 'quick-access' | 'rule-equations' | 'autosuggestion' | 'starred';
  context?: any;
}

export type AutoSuggestionEntry = PistonEntry;

export interface RuleDetailPopupState {
  ruleId: string;
  x: number;
  y: number;
}

export interface HabitDetailPopupState {
  habitId: string;
  x: number;
  y: number;
  level: number;
}

export interface PillarPopupState {
  pillarName: string;
  x: number;
  y: number;
  level?: number;
  z?: number;
}


export interface TaskContextPopupState {
  activityId: string;
  x: number;
  y: number;
  level: number;
  parentId?: string;
}

export interface ContentViewPopupState {
    id: string;
    resource: Resource;
    point: ResourcePoint;
    x: number;
    y: number;
}

export interface TodaysDietPopupState {
  id: string;
  x: number;
  y: number;
  z?: number;
}

export interface PathNode {
  id: string;
  text: string;
}

export interface MindsetPoint {
  id: string;
  text: string;
  completed?: boolean;
  coreDomainId?: CoreDomainId;
  means?: BotheringMeans;
  resolution?: string;
  endDate?: string;
  mismatchType?: 'mental-model' | 'cognitive-load' | 'threat-prediction' | 'action-sequencing';
  constraintType?: 'externally-imposed' | 'self-imposed';
  linkedHabitIds?: string[];
  linkedUrgeIds?: string[];
  linkedResistanceIds?: string[];
  linkedMismatchIds?: string[];
  linkedExternalIds?: string[];
  tasks?: {
    id: string;
    type: ActivityType;
    details: string;
    completed?: boolean;
    activityId?: string;
    dateKey?: string;
    slotName?: SlotName;
    recurrence?: 'none' | 'daily' | 'weekly' | 'custom';
    repeatInterval?: number;
    repeatUnit?: 'day' | 'week' | 'month';
    startDate?: string;
    completionHistory?: Record<string, boolean>;
  }[];
}

export interface MindsetTechniquePopupState {
  techniqueId: string;
  x: number;
  y: number;
  level: number;
  z?: number;
}

export interface StopperProgressPopupState {
    isOpen: boolean;
    stopper: Stopper | null;
    habitName: string | null;
}

export type JournalSessionStatus = 'in_progress' | 'completed';
export type JournalSection = 'opening' | 'slots' | 'botherings' | 'closeout' | 'done';
export type JournalSlotState = 'empty' | 'incomplete' | 'completed_with_remainder' | 'completed_exact';
export type JournalCauseCategory =
  | 'distraction'
  | 'low_energy'
  | 'external_demand'
  | 'transition_friction'
  | 'overplanned'
  | 'avoidance'
  | 'rest'
  | 'admin'
  | 'other';
export type JournalIntentionality = 'intentional' | 'mixed' | 'unintentional';
export type JournalBotheringStatus = 'solved' | 'partial' | 'not_solved' | 'changed' | 'active';

export interface JournalChatMessage {
  role: 'user' | 'assistant';
  content: string;
  promptId?: string;
  timestamp?: number;
}

export interface JournalCursor {
  stepId: string | null;
  stepIndex: number;
  totalSteps: number;
  section: JournalSection;
}

export interface JournalOpeningReview {
  moodRating?: number | null;
  energyRating?: number | null;
  stressRating?: number | null;
  note?: string;
}

export interface JournalTaskReflection {
  taskId: string;
  status: 'completed' | 'incomplete' | 'missed' | 'partial' | 'unknown';
  missReasonCategory?: JournalCauseCategory;
  actualActivityType?: string;
  linkedStopperIds: string[];
  blockerSummary?: string;
  nextAction?: string;
  rescheduleDateKey?: string;
  rescheduleSlotName?: SlotName;
  rescheduleFit?: 'pending' | 'confirmed' | 'skipped' | 'not_needed';
  note?: string;
}

export interface JournalSlotReview {
  slotName: SlotName;
  slotState: JournalSlotState;
  scheduledTaskIds: string[];
  completedTaskIds: string[];
  incompleteTaskIds: string[];
  loggedMinutes: number;
  untrackedMinutes: number;
  actualActivityType?: string;
  causeCategory?: JournalCauseCategory;
  intentionality?: JournalIntentionality;
  feelingRating?: number | null;
  linkedStopperIds: string[];
  note?: string;
  taskReflections: JournalTaskReflection[];
}

export interface JournalBotheringReflection {
  botheringId: string;
  sourceType: 'external' | 'mismatch' | 'constraint';
  status?: JournalBotheringStatus;
  feelingRating?: number | null;
  blockerCategory?: JournalCauseCategory;
  todaySummary?: string;
  resolutionSummary?: string;
  linkedTaskIds: string[];
  linkedStopperIds: string[];
  nextAction?: string;
  dueTaskWindowNote?: string;
  contextualData?: Record<string, unknown>;
}

export interface JournalCloseout {
  tomorrowFocus?: string;
  tomorrowProtection?: string;
  carryForwardNotes?: string;
}

export interface DailyJournalSession {
  id: string;
  date: string; // YYYY-MM-DD
  status: JournalSessionStatus;
  startedAt: number;
  completedAt?: number | null;
  opening: JournalOpeningReview;
  slotReviews: JournalSlotReview[];
  botheringReviews: JournalBotheringReflection[];
  closeout: JournalCloseout;
  cursor: JournalCursor;
  messages?: JournalChatMessage[];
}

export type MindsetPathId = 'reality_interpretation_debugger';
export type MindsetSessionStatus = 'in_progress' | 'completed' | 'abandoned';
export type MindsetPathAnswerValue = string | string[];

export interface MindsetSessionCursor {
  stepId: string | null;
  stepIndex: number;
  totalSteps: number;
}

export interface MindsetSessionLinkTarget {
  type: 'task' | 'bothering' | 'none';
  id?: string;
  label?: string;
}

export interface MindsetPathAnswer {
  stepId: string;
  value: MindsetPathAnswerValue;
  label?: string;
  note?: string;
  answeredAt: number;
}

export interface MindsetPathSummary {
  observableReality?: string;
  mindInterpretation?: string;
  evidenceStatus?: string;
  futureProjection?: string;
  bodyState: string[];
  witness?: string;
  identityPosition?: string;
  groundedAction?: string;
  conclusion?: string;
}

export interface MindsetChatMessage {
  role: 'user' | 'assistant';
  content: string;
  stepId?: string;
  timestamp?: number;
}

export interface MindsetSession {
  id: string;
  pathId: MindsetPathId;
  status: MindsetSessionStatus;
  startedAt: number;
  completedAt?: number | null;
  linkTarget: MindsetSessionLinkTarget;
  cursor: MindsetSessionCursor;
  answers: MindsetPathAnswer[];
  summary: MindsetPathSummary;
  messages?: MindsetChatMessage[];
}

export interface MissedSlotReview {
    id: string; // composite key: `${date}-${slotName}`
    reason: string;
    followedRuleIds: string[];
    snoozedUntil?: number; // timestamp
    journalSessionId?: string;
    slotState?: JournalSlotState;
    untrackedMinutes?: number;
    causeCategory?: JournalCauseCategory;
    linkedStopperIds?: string[];
    activitySummary?: string;
}

export interface Priority {
  id: string;
  text: string;
  completed: boolean;
  deadline?: string; // Stored as ISO string: yyyy-MM-dd
}

export interface BrainHack {
  id: string;
  text: string;
  parentId?: string | null;
  type?: 'hack' | 'link';
  link?: string;
  displayText?: string;
  linkedUpskillIds?: string[];
  linkedDeepWorkIds?: string[];
  linkedResourceIds?: string[];
}

export interface PipState {
    isOpen: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

export interface WidgetVisibility {
  agenda: boolean;
  smartLogging: boolean;
  pistons: boolean;
  mindset: boolean;
  activityDistribution: boolean;
  favorites: boolean;
  topPriorities: boolean;
  goals: boolean;
  brainHacks: boolean;
  ruleEquations: boolean;
  visualizationTechniques: boolean;
  spacedRepetition: boolean;
}

export type CoreDomainId =
  | 'health'
  | 'wealth'
  | 'relations'
  | 'meaning'
  | 'competence'
  | 'autonomy'
  | 'creativity'
  | 'contribution'
  | 'transcendence';

export type MeansPillar = 'money' | 'method' | 'ability';
export type MeansStatus = 'missing' | 'building' | 'ready';

export interface BotheringMeansValue {
  status: MeansStatus;
  category?: string;
  notes?: string;
}

export type BotheringMeans = Partial<Record<MeansPillar, BotheringMeansValue>>;

export interface MeansEntry {
  id: string;
  pillar: MeansPillar;
  category: string;
  title: string;
  status: MeansStatus;
  notes?: string;
  linkedProjectIds?: string[];
}

export interface MeansState {
  entries: MeansEntry[];
}

export interface UserSettings {
  ispSimpleMode?: boolean;
  ispSimpleKeepCanvasAndBotherings?: boolean;
  carryForward: boolean;
  autoPush: boolean;
  autoPushLimit: number;
  dailyProductiveHoursGoal?: number;
  carryForwardEssentials: boolean;
  carryForwardNutrition: boolean;
  smartLogging: boolean;
  defaultHabitLinks: Partial<Record<ActivityType, string | null>>;
  routines: Activity[];
  workoutScheduling: WorkoutSchedulingMode;
  slotRules: Partial<Record<SlotName, string[]>>;
  schedulingLevel?: 1 | 2 | 3;
  widgetVisibility: WidgetVisibility;
  allWidgetsVisible: boolean;
  agendaShowCurrentSlotOnly: boolean;
  currentPurpose?: string;
  spacedRepetitionSlot?: SlotName;
  pdfViewerWidth?: number;
  pdfViewerHeight?: number;
  pdfViewerPositionX?: number;
  pdfViewerPositionY?: number;
  kokoroTtsBaseUrl?: string;
  xttsTtsBaseUrl?: string;
  xttsVoiceSamplePath?: string;
  xttsVoiceName?: string;
  xttsLanguage?: string;
  astraReplyLanguage?: 'auto' | 'english' | 'hindi' | 'hinglish';
  localSttBaseUrl?: string;
  timestampAnnotationOffset?: number;
  drawingCanvasAutoSaveInterval?: number;
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubPath?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabasePdfBucket?: string;
  supabaseServiceRoleKey?: string;
  lastSync?: { sha: string, timestamp: number };
  githubModuleHashes?: Record<string, string>;
  githubPulledHashes?: Record<string, string>;
  pinnedCanvasIds?: string[];
  coreStateManualOverrides?: Partial<Record<string, CoreDomainId>>;
  routineRebalanceLearning?: {
    history: Array<{
      id: string;
      routineId: string;
      action: 'move_slot' | 'stagger';
      model?: 'pressure' | 'utilization';
      fromSlot: SlotName;
      toSlot?: SlotName;
      appliedAt: number;
      baselineMissRate: number;
      baselineDue: number;
      source: 'guarded_apply';
    }>;
  };
  routineSkipByDate?: Record<string, string[]>;
  routineSourceOverrides?: Record<string, 'external' | 'mismatch'>;
  pdfLastOpenedPageByResourceId?: Record<string, number>;
  pdfDailyPageTargetByResourceId?: Record<string, number>;
  pdfDailyPageStatsByResourceId?: Record<string, { date: string; startPage: number; maxPage: number }>;
  pdfAnnotationsByResourceId?: Record<string, Record<string, PdfPageAnnotation[]>>;
  flashcardSessions?: FlashcardSessionIndex[];
  flashcardTopicTablesBySpecializationId?: Record<string, FlashcardTopicTable>;
  learningPerformanceDailyLogs?: Record<string, LearningPerformanceLogEntry[]>;
  stateDiagramStore?: StateDiagramStore;
  ai?: {
    provider: 'none' | 'ollama' | 'openai' | 'perplexity' | 'anthropic';
    model: string;
    ollamaBaseUrl?: string;
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    perplexityApiKey?: string;
    perplexityBaseUrl?: string;
    anthropicApiKey?: string;
    anthropicBaseUrl?: string;
    requestTimeoutMs?: number;
  };
  shivDynamicTaskAliases?: Record<string, string[]>;
  shivAliasRefreshMeta?: {
    lastRefreshedAt?: string;
    sourceProvider?: string;
    sourceModel?: string;
    version?: number;
  };
  means?: MeansState;
}

export interface LearningPerformanceLogEntry {
  id: string;
  dateKey: string;
  specializationId: string;
  specializationName: string;
  activityType: ActivityType;
  sourceTaskId?: string;
  durationMinutes: number;
  pagesCompleted: number;
  hoursCompleted: number;
  itemsCompleted: number;
}

export interface StateDiagramNodeConfig {
  id: string;
  title: string;
  subtitle: string;
  note: string;
  x: number;
  y: number;
  fill: string;
  linkedBrainHackId?: string | null;
}

export interface StateDiagramEdgeConfig {
  id: string;
  from: string;
  to: string;
  label: string;
  color: string;
}

export interface StateDiagramDocConfig {
  id: string;
  name: string;
  nodes: StateDiagramNodeConfig[];
  edges: StateDiagramEdgeConfig[];
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface StateDiagramStore {
  diagrams: StateDiagramDocConfig[];
  activeDiagramId: string;
}

export interface ActiveFocusSession {
  activity: Activity;
  duration: number; // in minutes
  secondsLeft: number;
  totalSeconds: number;
  startTime: number;
  state: 'running' | 'paused' | 'idle';
  subTaskStartTime?: number;
}

export interface LinkTechniqueModalState {
    isOpen: boolean;
    habitId: string;
    stopper: Stopper;
    stage: 2 | 3;
}

export interface RepetitionData {
  microSkillId: string;
  performanceHistory: {
    date: string; // YYYY-MM-DD
    result: 'success' | 'fail';
  }[];
  repetitions: number; // successful recalls in a row
  interval: number; // days
  easeFactor: number;
  nextReviewDate: string | null; // YYYY-MM-DD
}

export interface DailyReviewLog {
    date: string; // YYYY-MM-DD
    completedResourceIds: string[];
}

export interface PlaybackRequest {
  resourceId: string;
  timestamp: number;
  endTime?: number;
}

export interface AudioAnnotation {
    id: string;
    note: string;
    timestamp: number;
    endTime?: number;
}

export interface PdfAnnotationPoint {
    x: number;
    y: number;
}

export interface PdfAnnotationStroke {
    kind?: "stroke";
    color: string;
    size: number;
    points: PdfAnnotationPoint[];
}

export interface PdfTextHighlightRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PdfTextHighlight {
    kind: "text-highlight";
    color: string;
    opacity: number;
    rects: PdfTextHighlightRect[];
    id?: string;
    text?: string;
    createdAt?: string;
}

export type PdfPageAnnotation = PdfAnnotationStroke | PdfTextHighlight;

export interface FlashcardSessionIndex {
  id: string;
  createdAt: string;
  dateKey: string;
  resourceId: string;
  resourceName: string;
  specializationId: string;
  specializationName: string;
  taskKey: string;
  taskDefinitionId: string;
  taskActivityType: "deepwork" | "upskill";
  bookName: string;
  startPage: number;
  endPage: number;
  folderId: string;
  flashcardResourceIds: string[];
}

export interface FlashcardTopicEntry {
  id: string;
  name: string;
  normalizedName: string;
  flashcardResourceIds: string[];
}

export interface FlashcardTopicTable {
  specializationId: string;
  specializationName: string;
  topics: FlashcardTopicEntry[];
}

export interface PdfViewerLaunchContext {
  sourceActivityId?: string | null;
  sourceDefinitionId?: string | null;
  sourceTaskActivityType?: "deepwork" | "upskill" | null;
}

export interface PdfViewerPopupState {
  isOpen: boolean;
  resource: Resource | null;
  position: { x: number; y: number };
  size?: { width: number; height?: number };
  launchContext?: PdfViewerLaunchContext | null;
}

export type DrawingCanvasData = {
    id: string; // Composite: `${resourceId}-${pointId}`
    resourceId: string;
    pointId: string;
    name: string;
    data?: string; // JSON string of excalidraw data
    isPinned?: boolean;
};
export interface DrawingCanvasPopupState {
  isOpen: boolean;
  activeCanvasId: string | null;
  openCanvases: DrawingCanvasData[];
  position: { x: number, y: number };
  size?: 'normal' | 'compact';
}

export interface DailyLearningLog {
    date: string;
    completedResourceIds: string[];
}
