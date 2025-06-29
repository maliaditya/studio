
import type { ExerciseDefinition, AllWorkoutPlans } from '@/types/workout';

export const DEFAULT_EXERCISE_DEFINITIONS: ExerciseDefinition[] = [
    { id: 'def_1', name: '1-Arm Dumbbell Row', category: 'Back' },
    { id: 'def_2', name: 'Back dips', category: 'Triceps' },
    { id: 'def_3', name: 'Back extensions', category: 'Back' },
    { id: 'def_4', name: 'Barbell Row', category: 'Back' },
    { id: 'def_5', name: 'Cable Curls', category: 'Biceps' },
    { id: 'def_6', name: 'Cable Curls Superset', category: 'Biceps' },
    { id: 'def_7', name: 'Cable Fly', category: 'Chest' },
    { id: 'def_8', name: 'Cable Rope Pushdown (Slow)', category: 'Triceps' },
    { id: 'def_9', name: 'Cable Upright Rows', category: 'Shoulders' },
    { id: 'def_10', name: 'Calfs (Bodyweight)', category: 'Legs' },
    { id: 'def_11', name: 'Close-Grip Barbell Bench Press', category: 'Triceps' },
    { id: 'def_12', name: 'DeadLifts', category: 'Back' },
    { id: 'def_13', name: 'Decline Dumbbell Press', category: 'Chest' },
    { id: 'def_14', name: 'Double-Arm Dumbbell Kickback', category: 'Triceps' },
    { id: 'def_15', name: 'Dumbbell Chest Fly', category: 'Chest' },
    { id: 'def_16', name: 'Dumbbell Flat Press', category: 'Chest' },
    { id: 'def_17', name: 'Dumbbell Kickback', category: 'Triceps' },
    { id: 'def_18', name: 'Dumbbell Lateral Raise (Lean in)', category: 'Shoulders' },
    { id: 'def_19', name: 'Dumbbell Pullovers', category: 'Chest' },
    { id: 'def_20', name: 'Face Pulls', category: 'Shoulders' },
    { id: 'def_21', name: 'Flat Barbell Bench Press', category: 'Chest' },
    { id: 'def_22', name: 'Front Raise cable', category: 'Shoulders' },
    { id: 'def_23', name: 'Hammer Curl (Dumbbell)', category: 'Biceps' },
    { id: 'def_24', name: 'Hamstring machine', category: 'Legs' },
    { id: 'def_25', name: 'Incline Barbell Press', category: 'Chest' },
    { id: 'def_26', name: 'Incline Dumbbell Press', category: 'Chest' },
    { id: 'def_27', name: 'Lat Prayer Pull', category: 'Back' },
    { id: 'def_28', name: 'Lat Pulldown', category: 'Back' },
    { id: 'def_29', name: 'Lat Pulldown (Wide Grip)', category: 'Back' },
    { id: 'def_30', name: 'Lean-Away Cable Lateral Raise', category: 'Shoulders' },
    { id: 'def_31', name: 'Leg Press', category: 'Legs' },
    { id: 'def_32', name: 'Machine Row', category: 'Back' },
    { id: 'def_33', name: 'Overhead Cable Extension', category: 'Triceps' },
    { id: 'def_34', name: 'Overhead Dumbbell Extension', category: 'Triceps' },
    { id: 'def_35', name: 'Peck Machine', category: 'Chest' },
    { id: 'def_36', name: 'Preacher curls Dumbbells', category: 'Biceps' },
    { id: 'def_37', name: 'Quads Machine', category: 'Legs' },
    { id: 'def_38', name: 'Rear Delt Fly (Incline Bench)', category: 'Shoulders' },
    { id: 'def_39', name: 'Reverse Bar Pushdown', category: 'Triceps' },
    { id: 'def_40', name: 'Reverse Cable', category: 'Biceps' },
    { id: 'def_41', name: 'Reversed cable curls', category: 'Biceps' },
    { id: 'def_42', name: 'Reversed Incline curls', category: 'Biceps' },
    { id: 'def_43', name: 'Rope Pushdown', category: 'Triceps' },
    { id: 'def_44', name: 'Seated Dumbbell Alternating Curl', category: 'Biceps' },
    { id: 'def_45', name: 'Seated Dumbbell Lateral Raise', category: 'Shoulders' },
    { id: 'def_46', name: 'Seated Dumbbell Shoulder Press', category: 'Shoulders' },
    { id: 'def_47', name: 'Seated Incline Dumbbell Curl', category: 'Biceps' },
    { id: 'def_48', name: 'Seated Machine Curls', category: 'Biceps' },
    { id: 'def_49', name: 'Seated Row', category: 'Back' },
    { id: 'def_50', name: 'Shrugs', category: 'Shoulders' },
    { id: 'def_51', name: 'Squats (Barbell)', category: 'Legs' },
    { id: 'def_52', name: 'Standing Dumbbell Alternating Curl', category: 'Biceps' },
    { id: 'def_53', name: 'Standing dumbbell curls', category: 'Biceps' },
    { id: 'def_54', name: 'Standing Dumbbell Lateral Raise', category: 'Shoulders' },
    { id: 'def_55', name: 'Straight bar pushdown', category: 'Triceps' },
    { id: 'def_56', name: 'Strict bar curls', category: 'Biceps' },
    { id: 'def_57', name: 'T-Bar Row', category: 'Back' },
    { id: 'def_58', name: 'V handle lat pulldown', category: 'Back' },
    { id: 'def_59', name: 'Walking Lunges (Barbell)', category: 'Legs' },
    { id: 'def_60', name: 'Concentration Curl', category: 'Biceps' },
    { id: 'def_61', name: 'Hack Squats', category: 'Legs' },
    { id: 'def_62', name: 'Preacher Curls Bar', category: 'Biceps' },
    { id: 'def_63', name: 'Front Raise Dumbbells', category: 'Shoulders' },
    { id: 'def_64', name: 'Overhead Bar extension', category: 'Triceps' },
    { id: 'def_65', name: 'Reverse-grip pushdown', category: 'Triceps' },
    { id: 'def_66', name: 'Single Arm Dumbbell Extensions', category: 'Triceps'},
    { id: 'def_67', name: 'Flat Bench Chest Fly', category: 'Chest'},
];

export const INITIAL_PLANS: AllWorkoutPlans = {
  "W1": {
    "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"],
    "Triceps": ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Dumbbell Kickback", "Rope Pushdown"],
    "Back": ["Lat Pulldown", "Machine Row", "T-Bar Row", "Lat Prayer Pull"],
    "Biceps": ["Standing dumbbell curls", "Standing Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"],
    "Shoulders": ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls", "Shrugs"],
    "Legs": ["Walking Lunges (Barbell)", "Leg Press", "Quads Machine", "Hamstring machine"]
  },
  "W2": {
    "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Cable Fly"],
    "Triceps": ["Overhead Dumbbell Extension", "Overhead Bar extension", "Rope Pushdown", "Dumbbell Kickback"],
    "Back": ["Lat Pulldown (Wide Grip)", "V handle lat pulldown", "1-Arm Dumbbell Row", "Back extensions"],
    "Biceps": ["Seated Incline Dumbbell Curl", "Seated Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Reverse Cable"],
    "Shoulders": ["Seated Dumbbell Shoulder Press", "Seated Dumbbell Lateral Raise", "Rear Delt Fly (Incline Bench)", "Cable Upright Rows"],
    "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "hamstring machine", "Quads Machine"]
  },
  "W3": {
    "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine"],
    "Triceps": ["Overhead Cable Extension", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"],
    "Back": ["Lat Pulldown", "Barbell Row", "Seated Row", "Lat Prayer Pull"],
    "Biceps": ["Strict bar curls", "Reversed Incline curls", "Cable Curls Superset", "Reversed cable curls"],
    "Shoulders": ["Seated Dumbbell Shoulder Press", "Dumbbell Lateral Raise (Lean in)", "Face Pulls", "Shrugs"],
    "Legs": ["Leg Press", "Quads Machine", "Hamstring machine", "Calfs (Bodyweight)"]
  },
  "W4": {
    "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Dumbbell Pullovers", "Cable Fly"],
    "Triceps": ["Overhead Cable Extension", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"],
    "Back": ["Lat Pulldown", "1-Arm Dumbbell Row", "V handle lat pulldown", "DeadLifts"],
    "Biceps": ["Seated Machine Curls", "Cable Curls", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)"],
    "Shoulders": ["Seated Dumbbell Shoulder Press", "Lean-Away Cable Lateral Raise", "Face Pulls", "Front Raise cable"],
    "Legs": ["Walking Lunges (Barbell)", "Squats (Barbell)", "hamstring machine", "Quads Machine"]
  },
  "W5": {
    "Chest": ["Flat Barbell Bench Press", "Incline Barbell Press", "Decline Dumbbell Press", "Peck Machine", "Cable Fly", "Dumbbell Pullovers"],
    "Triceps": ["Close-Grip Barbell Bench Press", "Overhead Dumbbell Extension", "Dumbbell Kickback", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"],
    "Back": ["Lat Pulldown", "Machine Row", "T-Bar Row", "Lat Prayer Pull", "1-Arm Dumbbell Row", "DeadLifts"],
    "Biceps": ["Standing dumbbell curls", "Standing Dumbbell Alternating Curl", "Preacher curls Dumbbells", "Hammer Curl (Dumbbell)", "Reversed cable curls", "Reversed Incline curls"],
    "Shoulders": ["Seated Dumbbell Shoulder Press", "Standing Dumbbell Lateral Raise", "Face Pulls", "Cable Upright Rows", "Front Raise Dumbbells", "Shrugs"],
    "Legs": ["Squats (Barbell)", "Leg Press", "Quads Machine", "Hamstring machine", "Walking Lunges (Barbell)", "Calfs (Bodyweight)"]
  },
  "W6": {
    "Chest": ["Dumbbell Flat Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Peck Machine", "Flat Bench Chest Fly", "Dumbbell Pullovers"],
    "Triceps": ["Overhead Cable Extension", "Single Arm Dumbbell Extensions", "Rope Pushdown", "Straight bar pushdown", "Reverse Bar Pushdown", "Back dips"],
    "Back": ["Lat Pulldown", "1-Arm Dumbbell Row", "V handle lat pulldown", "Barbell Row", "Lat Prayer Pull", "Back extensions"],
    "Biceps": ["Strict bar curls", "Seated Incline Dumbbell Curl", "Seated Dumbbell Alternating Curl", "Preacher Curls Bar", "Reverse Cable", "Concentration Curl"],
    "Shoulders": ["Seated Dumbbell Shoulder Press", "Lean-Away Cable Lateral Raise", "Face Pulls", "Front Raise cable", "Cable Upright Rows", "Shrugs"],
    "Legs": ["Walking Lunges (Barbell)", "Hack Squats", "hamstring machine", "Quads Machine", "Leg Press", "Calfs (Bodyweight)"]
  }
};

export const LEAD_GEN_DEFINITIONS: ExerciseDefinition[] = [
    { id: 'lg_1', name: 'Cold DM 2 people', category: 'Lead Generation', description: 'Target: 1 founder/client, 1 recruiter/hiring manager.' },
    { id: 'lg_2', name: 'Comment on 3 relevant posts', category: 'Lead Generation', description: 'Focus on founders, devs, and hiring managers.' },
    { id: 'lg_3', name: 'Join 1 forum/group weekly', category: 'Lead Generation', description: 'e.g., IndieHackers, Reddit, Discord, LinkedIn groups.' },
];

export const OFFER_SYSTEM_DEFINITIONS: ExerciseDefinition[] = [
    { id: 'os_1', name: 'Define freelance services', category: 'Offer System', description: 'Clearly outline what you offer, your process, and deliverables.' },
    { id: 'os_2', name: 'Create "Hire Me" page', category: 'Offer System', description: 'Build a dedicated section on your website for potential clients.' },
    { id: 'os_3', name: 'Develop pricing packages', category: 'Offer System', description: 'Structure your services into clear, tiered packages (if applicable).' },
    { id: 'os_4', name: 'Update resume & profiles', category: 'Offer System', description: 'Refresh your resume and online profiles (LinkedIn, etc.) for job searches.' },
];
