import { describe, expect, it } from 'vitest';
import { createSeed, DEMO_NOW, DEMO_TODAY, isEligible, plans, reducer } from './model';
import type { AppState, ClassSession, Member, MemberStatus, Payment, Task, WorkoutLog } from './model';

/** Each test gets independent, branch-compatible members and an unfilled future session. */
function bookingFixture(capacity = 1): AppState {
  const seed = createSeed();
  const session: ClassSession = {
    id: 'test-class',
    title: 'Future strength session',
    category: 'Strength',
    branchId: 'koramangala',
    instructor: 'Arjun Nair',
    room: 'Training floor',
    startAt: '2026-10-23T13:00:00+05:30',
    duration: 45,
    capacity,
    bookings: [],
    waitlist: [],
  };
  return {
    ...seed,
    members: seed.members.map(member => ({
      ...member,
      status: 'active',
      planId: 'plus',
      expiresAt: '2026-11-30',
      credits: 4,
      lastVisit: null,
    })),
    classes: [session],
    tasks: [],
    payments: [],
    workouts: [],
    audit: [],
  };
}

function member(state: AppState, id = 'm-1') {
  return state.members.find(item => item.id === id)!;
}

function payment(memberId: string, overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'test-payment',
    memberId,
    invoiceNumber: 'QF-TEST-001',
    amount: plans[1].amount,
    status: 'pending',
    method: 'UPI',
    createdAt: DEMO_NOW,
    description: 'Performance · Monthly membership',
    ...overrides,
  };
}

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: 'Renewal follow-up',
    memberId: 'm-1',
    branchId: 'koramangala',
    done: false,
    kind: 'renewal',
    createdAt: DEMO_NOW,
    ...overrides,
  };
}

describe('member enrollment and payment integrity', () => {
  it('rejects duplicate email enrollment irrespective of letter case, including its payment', () => {
    const state = createSeed();
    const duplicate: Member = {
      ...member(state),
      id: 'duplicate-member',
      email: member(state).email.toUpperCase(),
    };

    const result = reducer(state, {
      type: 'ADD_MEMBER',
      member: duplicate,
      payment: payment(duplicate.id),
    });

    expect(result).toBe(state);
    expect(result.members).toHaveLength(state.members.length);
    expect(result.payments).toHaveLength(state.payments.length);
    expect(result.audit).toHaveLength(state.audit.length);
  });

  it('keeps an enrollment pending until a simulated payment receipt activates it', () => {
    const state = createSeed();
    const pending: Member = {
      ...member(state),
      id: 'new-member',
      email: 'new.member@example.com',
      status: 'pending',
      expiresAt: '2026-11-22',
      lastVisit: null,
    };
    const enrolled = reducer(state, {
      type: 'ADD_MEMBER',
      member: pending,
      payment: payment(pending.id),
    });

    expect(member(enrolled, pending.id).status).toBe('pending');
    expect(isEligible(member(enrolled, pending.id))).toBe(false);
    expect(reducer(enrolled, { type: 'CHECK_IN', memberId: pending.id })).toBe(enrolled);

    const received = reducer(enrolled, { type: 'RECORD_PAYMENT', paymentId: 'test-payment' });
    expect(member(received, pending.id).status).toBe('active');
    expect(isEligible(member(received, pending.id))).toBe(true);
    expect(received.payments.find(item => item.id === 'test-payment')?.status).toBe('paid');
    expect(received.payments).toHaveLength(enrolled.payments.length);
  });

  it('derives unpaid enrollment status from the payment instead of trusting a requested active status', () => {
    const state = createSeed();
    const requestedActive: Member = {
      ...member(state),
      id: 'unpaid-member',
      email: 'unpaid.member@example.com',
      status: 'active',
      expiresAt: '2026-11-22',
    };

    const enrolled = reducer(state, {
      type: 'ADD_MEMBER',
      member: requestedActive,
      payment: payment(requestedActive.id),
    });

    expect(member(enrolled, requestedActive.id).status).toBe('pending');
    expect(isEligible(member(enrolled, requestedActive.id))).toBe(false);
  });

  it('records a payment once even if the receipt action is retried', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], status: 'pending' };
    state.payments = [payment('m-1')];
    const received = reducer(state, { type: 'RECORD_PAYMENT', paymentId: 'test-payment' });
    const repeated = reducer(received, { type: 'RECORD_PAYMENT', paymentId: 'test-payment' });

    expect(repeated).toBe(received);
    expect(repeated.payments).toHaveLength(1);
    expect(repeated.audit).toHaveLength(1);
    expect(member(repeated).status).toBe('active');
  });

  it('does not turn a refunded payment back into a successful collection', () => {
    const state = bookingFixture();
    state.payments = [payment('m-1', { status: 'refunded' })];
    expect(reducer(state, { type: 'RECORD_PAYMENT', paymentId: 'test-payment' })).toBe(state);
  });

  it('does not activate or extend an expired membership while its renewal payment is pending', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], status: 'expired', expiresAt: '2026-10-15' };

    const pending = reducer(state, {
      type: 'RENEW_MEMBER',
      memberId: 'm-1',
      payment: payment('m-1'),
    });

    expect(member(pending).status).toBe('expired');
    expect(member(pending).expiresAt).toBe('2026-10-15');
    expect(isEligible(member(pending))).toBe(false);
    expect(pending.payments).toHaveLength(1);
  });

  it('applies a paid renewal only once and restores the plan credit allowance', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], status: 'expired', expiresAt: '2026-10-15', credits: 0 };
    const renewalPayment = payment('m-1', { status: 'paid' });
    const renewed = reducer(state, { type: 'RENEW_MEMBER', memberId: 'm-1', payment: renewalPayment });

    expect(member(renewed).status).toBe('active');
    expect(member(renewed).expiresAt).toBe('2026-11-21');
    expect(member(renewed).credits).toBe(plans[1].credits);
    expect(reducer(renewed, { type: 'RENEW_MEMBER', memberId: 'm-1', payment: renewalPayment })).toBe(renewed);
  });

  it('activates and extends an expired renewal when its pending receipt is later recorded', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], status: 'expired', expiresAt: '2026-10-15', credits: 0 };
    const pending = reducer(state, { type: 'RENEW_MEMBER', memberId: 'm-1', payment: payment('m-1') });
    const received = reducer(pending, { type: 'RECORD_PAYMENT', paymentId: 'test-payment' });

    expect(member(received).status).toBe('active');
    expect(member(received).expiresAt).toBe('2026-11-21');
    expect(member(received).credits).toBe(plans[1].credits);
    expect(isEligible(member(received))).toBe(true);
  });
});

describe('class capacity and credit accounting', () => {
  it('confirms only one member for one place and waitlists the next without consuming their credit', () => {
    const state = bookingFixture(1);
    const first = reducer(state, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' });
    const second = reducer(first, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-2' });

    expect(second.classes[0].bookings).toEqual(['m-1']);
    expect(second.classes[0].bookings.length).toBeLessThanOrEqual(second.classes[0].capacity);
    expect(second.classes[0].waitlist).toEqual(['m-2']);
    expect(member(second, 'm-1').credits).toBe(3);
    expect(member(second, 'm-2').credits).toBe(4);
  });

  it('does not consume another credit or duplicate a confirmed reservation on retry', () => {
    const booked = reducer(bookingFixture(), { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' });
    const repeated = reducer(booked, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' });

    expect(repeated).toBe(booked);
    expect(member(repeated).credits).toBe(3);
    expect(repeated.classes[0].bookings).toEqual(['m-1']);
  });

  it('does not duplicate a waitlist entry on retry', () => {
    const booked = reducer(bookingFixture(), { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' });
    const queued = reducer(booked, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-2' });
    const repeated = reducer(queued, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-2' });

    expect(repeated).toBe(queued);
    expect(repeated.classes[0].waitlist).toEqual(['m-2']);
    expect(member(repeated, 'm-2').credits).toBe(4);
  });

  it('refunds cancellation once and promotes the first currently eligible waitlisted member', () => {
    const state = bookingFixture();
    state.classes[0] = { ...state.classes[0], bookings: ['m-1'], waitlist: ['m-2', 'm-3', 'm-4', 'm-5', 'm-6'] };
    state.members = state.members.map(item => {
      if (item.id === 'm-1') return { ...item, credits: 3 };
      if (item.id === 'm-2') return { ...item, status: 'expired' };
      if (item.id === 'm-3') return { ...item, credits: 0 };
      if (item.id === 'm-4') return { ...item, planId: 'essential', branchId: 'whitefield' };
      return item;
    });

    const cancelled = reducer(state, { type: 'CANCEL_BOOKING', sessionId: 'test-class', memberId: 'm-1' });

    expect(cancelled.classes[0].bookings).toEqual(['m-5']);
    expect(cancelled.classes[0].waitlist).toEqual(['m-2', 'm-3', 'm-4', 'm-6']);
    expect(member(cancelled, 'm-1').credits).toBe(4);
    expect(member(cancelled, 'm-5').credits).toBe(3);
    expect(member(cancelled, 'm-2').credits).toBe(4);
    expect(member(cancelled, 'm-3').credits).toBe(0);
    expect(member(cancelled, 'm-4').credits).toBe(4);
    expect(member(cancelled, 'm-6').credits).toBe(4);
    expect(reducer(cancelled, { type: 'CANCEL_BOOKING', sessionId: 'test-class', memberId: 'm-1' })).toBe(cancelled);
  });

  it('removes a waitlisted member without a credit refund or another member promotion', () => {
    const state = bookingFixture();
    state.classes[0] = { ...state.classes[0], bookings: ['m-1'], waitlist: ['m-2', 'm-3'] };

    const result = reducer(state, { type: 'CANCEL_BOOKING', sessionId: 'test-class', memberId: 'm-2' });

    expect(result.classes[0].bookings).toEqual(['m-1']);
    expect(result.classes[0].waitlist).toEqual(['m-3']);
    expect(result.members.map(item => item.credits)).toEqual(state.members.map(item => item.credits));
  });

  it('denies a new booking when no class credits remain', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], credits: 0 };
    expect(reducer(state, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' })).toBe(state);
  });

  it('denies sessions that have already started on the demo date', () => {
    const state = bookingFixture();
    state.classes[0] = { ...state.classes[0], startAt: `${DEMO_TODAY}T09:00:00+05:30` };
    expect(reducer(state, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' })).toBe(state);
  });

  it('requires the membership to remain valid on the future session date', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], expiresAt: DEMO_TODAY };

    expect(isEligible(member(state))).toBe(true);
    expect(reducer(state, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' })).toBe(state);
    expect(member(state).credits).toBe(4);
  });

  it('allows a future session on the final valid membership date', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], expiresAt: '2026-10-23' };
    const result = reducer(state, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' });

    expect(result.classes[0].bookings).toEqual(['m-1']);
    expect(member(result).credits).toBe(3);
  });

  it('rechecks session-date expiry before promoting a waitlisted member', () => {
    const state = bookingFixture();
    state.classes[0] = { ...state.classes[0], bookings: ['m-1'], waitlist: ['m-2', 'm-3'] };
    state.members[1] = { ...state.members[1], expiresAt: DEMO_TODAY };

    const result = reducer(state, { type: 'CANCEL_BOOKING', sessionId: 'test-class', memberId: 'm-1' });

    expect(result.classes[0].bookings).toEqual(['m-3']);
    expect(result.classes[0].waitlist).toEqual(['m-2']);
    expect(member(result, 'm-2').credits).toBe(4);
    expect(member(result, 'm-3').credits).toBe(3);
  });

  it('does not cancel a past reservation or refund its consumed credit', () => {
    const state = bookingFixture();
    state.classes[0] = { ...state.classes[0], startAt: `${DEMO_TODAY}T09:00:00+05:30`, bookings: ['m-1'] };
    state.members[0] = { ...state.members[0], credits: 3 };

    expect(reducer(state, { type: 'CANCEL_BOOKING', sessionId: 'test-class', memberId: 'm-1' })).toBe(state);
    expect(state.classes[0].bookings).toEqual(['m-1']);
    expect(member(state).credits).toBe(3);
  });
});

describe('membership entitlements and attendance', () => {
  it.each<MemberStatus>(['expired', 'pending', 'frozen'])('denies check-in and booking for a %s membership', status => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], status };

    expect(isEligible(member(state))).toBe(false);
    expect(reducer(state, { type: 'CHECK_IN', memberId: 'm-1' })).toBe(state);
    expect(reducer(state, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' })).toBe(state);
  });

  it('denies an active record whose expiry date has already passed', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], status: 'active', expiresAt: '2026-10-21' };
    expect(isEligible(member(state))).toBe(false);
    expect(reducer(state, { type: 'CHECK_IN', memberId: 'm-1' })).toBe(state);
    expect(reducer(state, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' })).toBe(state);
  });

  it('denies Essential class access outside the member home branch', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], planId: 'essential', branchId: 'whitefield' };

    expect(reducer(state, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' })).toBe(state);
    expect(member(state).credits).toBe(4);
  });

  it('allows an Essential class at the member home branch', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], planId: 'essential', branchId: 'koramangala' };
    const result = reducer(state, { type: 'BOOK_CLASS', sessionId: 'test-class', memberId: 'm-1' });

    expect(result.classes[0].bookings).toEqual(['m-1']);
    expect(member(result).credits).toBe(3);
  });

  it('records one check-in per demo day and increments visits only once', () => {
    const state = bookingFixture();
    const checkedIn = reducer(state, { type: 'CHECK_IN', memberId: 'm-1' });

    expect(member(checkedIn).visits).toBe(member(state).visits + 1);
    expect(member(checkedIn).lastVisit).toBe(DEMO_NOW);
    expect(reducer(checkedIn, { type: 'CHECK_IN', memberId: 'm-1' })).toBe(checkedIn);
  });

  it('does not let a profile edit activate an unpaid pending membership', () => {
    const state = bookingFixture();
    state.members[0] = { ...state.members[0], status: 'pending' };

    expect(reducer(state, { type: 'UPDATE_MEMBER', id: 'm-1', patch: { status: 'active' } })).toBe(state);
  });

  it('supports freeze and resume without bypassing an expired membership', () => {
    const state = bookingFixture();
    const frozen = reducer(state, { type: 'UPDATE_MEMBER', id: 'm-1', patch: { status: 'frozen' } });
    expect(member(frozen).status).toBe('frozen');
    expect(isEligible(member(frozen))).toBe(false);

    const resumed = reducer(frozen, { type: 'UPDATE_MEMBER', id: 'm-1', patch: { status: 'active' } });
    expect(member(resumed).status).toBe('active');

    const expiredFreeze = { ...frozen, members: frozen.members.map(item => item.id === 'm-1' ? { ...item, expiresAt: '2026-10-21' } : item) };
    expect(reducer(expiredFreeze, { type: 'UPDATE_MEMBER', id: 'm-1', patch: { status: 'active' } })).toBe(expiredFreeze);
  });
});

describe('class scheduling conflicts', () => {
  it('rejects overlapping instructor assignments even at another branch', () => {
    const state = bookingFixture();
    const overlap: ClassSession = {
      ...state.classes[0], id: 'conflicting-class', branchId: 'indiranagar', room: 'Studio B',
      startAt: '2026-10-23T13:15:00+05:30',
    };

    expect(reducer(state, { type: 'ADD_CLASS', session: overlap })).toBe(state);
  });

  it('rejects an overlapping room assignment even with a different instructor', () => {
    const state = bookingFixture();
    const overlap: ClassSession = {
      ...state.classes[0], id: 'conflicting-class', instructor: 'Sarah Fernandes',
      startAt: '2026-10-23T13:15:00+05:30',
    };

    expect(reducer(state, { type: 'ADD_CLASS', session: overlap })).toBe(state);
  });

  it('allows the next class to start exactly when the previous one ends', () => {
    const state = bookingFixture();
    const adjacent = { ...state.classes[0], id: 'next-class', startAt: '2026-10-23T13:45:00+05:30' };
    const result = reducer(state, { type: 'ADD_CLASS', session: adjacent });

    expect(result.classes).toHaveLength(2);
    expect(result.classes[1].id).toBe('next-class');
  });
});

describe('training plan publication', () => {
  it('rejects a plan without exercises', () => {
    const state = bookingFixture();
    state.trainingPlans[1] = { ...state.trainingPlans[1], exercises: [] };

    expect(reducer(state, { type: 'PUBLISH_PLAN', id: 'plan-2' })).toBe(state);
  });

  it('rejects an exercise without an instruction and a valid set count', () => {
    const state = bookingFixture();
    state.trainingPlans[1] = {
      ...state.trainingPlans[1],
      exercises: [{ name: '', sets: 0, reps: '12', rest: 60 }],
    };

    expect(reducer(state, { type: 'PUBLISH_PLAN', id: 'plan-2' })).toBe(state);
  });

  it('publishes a valid reviewed plan once and records one review outcome', () => {
    const state = bookingFixture();
    const published = reducer(state, { type: 'PUBLISH_PLAN', id: 'plan-2' });

    expect(published.trainingPlans.find(plan => plan.id === 'plan-2')?.status).toBe('published');
    expect(published.audit).toHaveLength(1);
    expect(reducer(published, { type: 'PUBLISH_PLAN', id: 'plan-2' })).toBe(published);
  });
});

describe('follow-up task deduplication', () => {
  it('does not create another open task for the same member and purpose', () => {
    const state = bookingFixture();
    state.tasks = [task('existing')];

    expect(reducer(state, { type: 'ADD_TASKS', tasks: [task('retry')] })).toBe(state);
  });

  it('deduplicates matching tasks inside a single incoming batch', () => {
    const state = bookingFixture();
    const result = reducer(state, { type: 'ADD_TASKS', tasks: [task('first'), task('second')] });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].memberId).toBe('m-1');
  });

  it('allows distinct purposes and a different member', () => {
    const state = bookingFixture();
    state.tasks = [task('existing')];
    const result = reducer(state, {
      type: 'ADD_TASKS',
      tasks: [task('payment', { kind: 'payment' }), task('other-member', { memberId: 'm-2' })],
    });

    expect(result.tasks).toHaveLength(3);
    expect(result.tasks.filter(item => item.memberId === 'm-1')).toHaveLength(2);
  });

  it('allows a new task after the earlier task was completed', () => {
    const state = bookingFixture();
    state.tasks = [task('completed', { done: true })];
    const result = reducer(state, { type: 'ADD_TASKS', tasks: [task('new')] });

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks.filter(item => !item.done)).toHaveLength(1);
  });
});

describe('daily workout completion', () => {
  const workout: WorkoutLog = {
    id: 'workout-first',
    memberId: 'm-1',
    planId: 'plan-1',
    completedAt: DEMO_NOW,
    sets: 12,
    effort: 7,
  };

  it('does not duplicate the same member and plan completion during the same day', () => {
    const first = reducer(bookingFixture(), { type: 'COMPLETE_WORKOUT', log: workout });
    const retry = reducer(first, {
      type: 'COMPLETE_WORKOUT',
      log: { ...workout, id: 'workout-retry', completedAt: `${DEMO_TODAY}T19:00:00+05:30` },
    });

    expect(retry).toBe(first);
    expect(retry.workouts).toHaveLength(1);
    expect(retry.audit).toHaveLength(1);
  });

  it('allows the same plan on a different day and an independent assigned member plan', () => {
    const state = bookingFixture();
    state.trainingPlans.push({ ...state.trainingPlans[0], id: 'plan-m2', memberId: 'm-2' });
    const first = reducer(state, { type: 'COMPLETE_WORKOUT', log: workout });
    const nextDay = reducer(first, {
      type: 'COMPLETE_WORKOUT',
      log: { ...workout, id: 'workout-next-day', completedAt: '2026-10-23T10:42:00+05:30' },
    });
    const otherMember = reducer(nextDay, {
      type: 'COMPLETE_WORKOUT',
      log: { ...workout, id: 'workout-other-member', memberId: 'm-2', planId: 'plan-m2' },
    });

    expect(otherMember.workouts).toHaveLength(3);
  });

  it('rejects a workout using another member’s published plan', () => {
    const state = bookingFixture();
    expect(reducer(state, { type: 'COMPLETE_WORKOUT', log: { ...workout, memberId: 'm-2' } })).toBe(state);
  });

  it('rejects completion of a plan still awaiting trainer review', () => {
    const state = bookingFixture();
    const unpublished = state.trainingPlans[1];
    const log = {
      ...workout,
      memberId: unpublished.memberId,
      planId: unpublished.id,
      sets: unpublished.exercises.reduce((sum, exercise) => sum + exercise.sets, 0),
    };

    expect(reducer(state, { type: 'COMPLETE_WORKOUT', log })).toBe(state);
  });

  it.each([11, 13])('rejects completion when %i logged sets do not match the prescribed 12', sets => {
    const state = bookingFixture();
    expect(reducer(state, { type: 'COMPLETE_WORKOUT', log: { ...workout, sets } })).toBe(state);
  });

  it.each([0, 11])('rejects an effort rating of %i outside the supported range', effort => {
    const state = bookingFixture();
    expect(reducer(state, { type: 'COMPLETE_WORKOUT', log: { ...workout, effort } })).toBe(state);
  });
});
