import { describe, expect, it, vi } from 'vitest';
import { enforceBudget, parseNotification, type BillingClient } from '../../functions/src/killSwitch';

const encode = (body: unknown) => Buffer.from(JSON.stringify(body)).toString('base64');

function fakeClient(billingEnabled: boolean) {
  return {
    getProjectBillingInfo: vi.fn(async () => [{ billingEnabled }] as [{ billingEnabled: boolean }]),
    updateProjectBillingInfo: vi.fn(async () => undefined),
  } satisfies BillingClient;
}

const notification = (costAmount: number) => ({
  budgetDisplayName: 'flash-cards monthly',
  costAmount,
  budgetAmount: 5,
  currencyCode: 'USD',
});

describe('parseNotification', () => {
  it('reads a Cloud Billing budget notification', () => {
    const data = encode({
      budgetDisplayName: 'flash-cards monthly',
      alertThresholdExceeded: 1.0,
      costAmount: 5.01,
      costIntervalStart: '2026-11-01T07:00:00Z',
      budgetAmount: 5,
      budgetAmountType: 'SPECIFIED_AMOUNT',
      currencyCode: 'USD',
    });
    expect(parseNotification(data)).toEqual(notification(5.01));
  });

  it('rejects messages that are not budget notifications', () => {
    expect(parseNotification(undefined)).toBeNull();
    expect(parseNotification(Buffer.from('not json').toString('base64'))).toBeNull();
    expect(parseNotification(encode({ hello: 'world' }))).toBeNull();
    expect(parseNotification(encode({ costAmount: '9', budgetAmount: 5 }))).toBeNull();
    expect(parseNotification(encode({ costAmount: 1, budgetAmount: 0 }))).toBeNull();
  });
});

describe('enforceBudget', () => {
  it('leaves billing alone while spend is under budget', async () => {
    const client = fakeClient(true);
    expect(await enforceBudget(notification(4.99), 'demo-project', client)).toBe('under-budget');
    expect(client.getProjectBillingInfo).not.toHaveBeenCalled();
    expect(client.updateProjectBillingInfo).not.toHaveBeenCalled();
  });

  it('unlinks the billing account once spend reaches the budget', async () => {
    const client = fakeClient(true);
    expect(await enforceBudget(notification(5), 'demo-project', client)).toBe('disabled');
    expect(client.updateProjectBillingInfo).toHaveBeenCalledWith({
      name: 'projects/demo-project',
      projectBillingInfo: { billingAccountName: '' },
    });
  });

  it('does nothing when billing is already off', async () => {
    const client = fakeClient(false);
    expect(await enforceBudget(notification(12), 'demo-project', client)).toBe('already-disabled');
    expect(client.updateProjectBillingInfo).not.toHaveBeenCalled();
  });
});
