import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const app = initializeApp({ credential: cert('./service-account.json') });
const db = getFirestore();
const UID = 'HTJlt5RxMjeJwZX9CHlPTeDzNfi1';

async function seed() {
    // 1. Seed routines
    const routineRef = db.collection('users').doc(UID).collection('routines').doc();
    await routineRef.set({
        title: 'Upper Body Hypertrophy',
        description: 'Foco en pecho, espalda y hombros con volumen moderado',
        status: 'active',
        exercises: [
            { name: 'Bench Press', sets: 4, reps: '8-10', rpe: 8, rest: '90s', weight: '70kg' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rpe: 7, rest: '60s', weight: '22kg' },
            { name: 'Pull-ups', sets: 3, reps: 'to failure', rpe: 9, rest: '90s' },
            { name: 'Lateral Raises', sets: 4, reps: '12-15', rpe: 7, rest: '45s', weight: '10kg' },
            { name: 'Face Pulls', sets: 3, reps: '15-20', rpe: 6, rest: '45s', weight: '15kg' },
        ],
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
    });
    console.log('✅ Routine 1 seeded:', routineRef.id);

    const routineRef2 = db.collection('users').doc(UID).collection('routines').doc();
    await routineRef2.set({
        title: 'Lower Body Strength',
        description: 'Enfocado en fuerza de piernas y core',
        status: 'active',
        exercises: [
            { name: 'Squat', sets: 5, reps: '5', rpe: 9, rest: '3min', weight: '100kg' },
            { name: 'Romanian Deadlift', sets: 4, reps: '8-10', rpe: 8, rest: '90s', weight: '80kg' },
            { name: 'Leg Press', sets: 3, reps: '12-15', rpe: 7, rest: '60s', weight: '180kg' },
            { name: 'Walking Lunges', sets: 3, reps: '12 each', rpe: 7, rest: '60s', weight: '20kg' },
        ],
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
    });
    console.log('✅ Routine 2 seeded:', routineRef2.id);

    // 2. Seed metrics
    const metricsData = [
        { type: 'weight', value: 82.5, notes: 'Morning weight', timestamp: new Date('2026-03-06') },
        { type: 'weight', value: 82.1, notes: 'Morning weight', timestamp: new Date('2026-03-07') },
        { type: 'weight', value: 81.8, notes: 'Morning weight', timestamp: new Date('2026-03-08') },
        { type: 'pain', value: 3, location: 'knee', notes: 'Slight discomfort after squats', timestamp: new Date('2026-03-06') },
        { type: 'pain', value: 2, location: 'knee', notes: 'Better today', timestamp: new Date('2026-03-07') },
        { type: 'pain', value: 1, location: 'knee', notes: 'Almost gone', timestamp: new Date('2026-03-08') },
        { type: 'fatigue', value: 7, notes: 'Tired after heavy session', timestamp: new Date('2026-03-06') },
        { type: 'fatigue', value: 5, notes: 'Normal', timestamp: new Date('2026-03-07') },
        { type: 'fatigue', value: 4, notes: 'Well rested', timestamp: new Date('2026-03-08') },
    ];

    for (const m of metricsData) {
        await db.collection('users').doc(UID).collection('metrics').add({ ...m, userId: UID });
    }
    console.log('✅ Metrics seeded:', metricsData.length, 'entries');
    console.log('\n🎉 SEED COMPLETE');
    process.exit(0);
}

seed().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
