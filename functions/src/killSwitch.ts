// Decides when a Cloud Billing budget notification should cut billing off.
// Kept free of SDK imports so the root unit tests can exercise it directly.

/** The fields of a budget notification this function reads. */
export interface BudgetNotification {
  budgetDisplayName: string;
  costAmount: number;
  budgetAmount: number;
  currencyCode: string;
}

/** The two Cloud Billing calls the kill switch makes. */
export interface BillingClient {
  getProjectBillingInfo(request: { name: string }): Promise<[{ billingEnabled?: boolean | null }, ...unknown[]]>;
  updateProjectBillingInfo(request: {
    name: string;
    projectBillingInfo: { billingAccountName: string };
  }): Promise<unknown>;
}

export type Outcome = 'under-budget' | 'already-disabled' | 'disabled';

/** Parses a Pub/Sub message body (base64 JSON). Returns null if it isn't a budget notification. */
export function parseNotification(base64Data: string | undefined): BudgetNotification | null {
  if (!base64Data) return null;
  let body: unknown;
  try {
    body = JSON.parse(Buffer.from(base64Data, 'base64').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof body !== 'object' || body === null) return null;
  const { budgetDisplayName, costAmount, budgetAmount, currencyCode } = body as Record<string, unknown>;
  if (typeof costAmount !== 'number' || typeof budgetAmount !== 'number' || budgetAmount <= 0) return null;
  return {
    budgetDisplayName: typeof budgetDisplayName === 'string' ? budgetDisplayName : '',
    costAmount,
    budgetAmount,
    currencyCode: typeof currencyCode === 'string' ? currencyCode : '',
  };
}

/**
 * Detaches the billing account from the project once actual spend reaches the budget.
 * Forecast-only alerts don't trigger it: costAmount is always the spend so far.
 */
export async function enforceBudget(
  notification: BudgetNotification,
  projectId: string,
  client: BillingClient,
): Promise<Outcome> {
  if (notification.costAmount < notification.budgetAmount) return 'under-budget';

  const name = `projects/${projectId}`;
  const [info] = await client.getProjectBillingInfo({ name });
  if (!info.billingEnabled) return 'already-disabled';

  // An empty billing account name unlinks billing, which stops every paid service on the project.
  await client.updateProjectBillingInfo({ name, projectBillingInfo: { billingAccountName: '' } });
  return 'disabled';
}
