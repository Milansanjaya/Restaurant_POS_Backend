import Shift from "../modules/shifts/shift.model";
import Sale from "../modules/sales/sale.model";

const AUTO_CLOSE_REASON = "AUTO_CLOSE_23_59";

const get2359Cutoff = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 0, 0);

const sumCashSalesForShift = async (params: {
  branch_id: string;
  cashierId: any;
  from: Date;
  to: Date;
}) => {
  const sales = await Sale.find({
    branch_id: params.branch_id,
    status: "COMPLETED",
    paymentMethod: "CASH",
    createdBy: params.cashierId,
    createdAt: { $gte: params.from, $lte: params.to },
  }).select("grandTotal");

  return sales.reduce((sum, sale: any) => sum + Number(sale.grandTotal || 0), 0);
};

export const autoCloseShiftIfDue = async (shift: any, now: Date) => {
  if (!shift || shift.status !== "OPEN") return false;

  const cutoff = get2359Cutoff(new Date(shift.openedAt));
  if (now.getTime() < cutoff.getTime()) return false;

  const totalCashSales = await sumCashSalesForShift({
    branch_id: shift.branch_id,
    cashierId: shift.cashier,
    from: shift.openedAt,
    to: cutoff,
  });

  const openingCash = Number(shift.openingCash || 0);
  const expectedCash = openingCash + totalCashSales;

  shift.closingCash = expectedCash;
  shift.expectedCash = expectedCash;
  shift.cashDifference = 0;
  shift.status = "CLOSED";
  shift.closedAt = cutoff;

  shift.autoClosed = true;
  shift.autoClosedAt = now;
  shift.autoClosedReason = AUTO_CLOSE_REASON;

  await shift.save();
  return true;
};

export const autoCloseOpenShiftForCashierIfDue = async (params: {
  branch_id: string;
  cashierId: string;
  now?: Date;
}) => {
  const now = params.now ?? new Date();
  const shift = await Shift.findOne({
    branch_id: params.branch_id,
    cashier: params.cashierId,
    status: "OPEN",
  });

  if (!shift) return { closed: false, shift: null };

  const closed = await autoCloseShiftIfDue(shift, now);
  return { closed, shift: closed ? null : shift };
};

export const autoCloseAllDueShifts = async (now: Date = new Date()) => {
  const openShifts = await Shift.find({ status: "OPEN" });
  let closedCount = 0;

  for (const shift of openShifts) {
    try {
      const closed = await autoCloseShiftIfDue(shift, now);
      if (closed) closedCount += 1;
    } catch (err) {
      console.error("AUTO SHIFT CLOSE failed:", err);
    }
  }

  return closedCount;
};

let timer: NodeJS.Timeout | null = null;

const getNext2359 = (now: Date) => {
  const todayCutoff = get2359Cutoff(now);
  if (now.getTime() < todayCutoff.getTime()) return todayCutoff;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return get2359Cutoff(tomorrow);
};

export const startShiftAutoCloseScheduler = () => {
  if (timer) return;

  const scheduleNext = () => {
    const now = new Date();
    const nextRun = getNext2359(now);
    const delayMs = Math.max(0, nextRun.getTime() - now.getTime());

    timer = setTimeout(async () => {
      try {
        const closedCount = await autoCloseAllDueShifts(nextRun);
        if (closedCount > 0) {
          console.log(`\u23f0 Auto-closed ${closedCount} shift(s) at 23:59`);
        }
      } finally {
        timer = null;
        scheduleNext();
      }
    }, delayMs);
  };

  // Catch-up on startup (in case the server was down at 23:59)
  autoCloseAllDueShifts(new Date()).catch((err) =>
    console.error("AUTO SHIFT CLOSE startup run failed:", err)
  );

  scheduleNext();
};
