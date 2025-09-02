// Finances.jsx • Proago CRM (v2025-08-29j)
// Changes:
// • Year pill styled black/white (match Pay/Planning)
// • Add status selector (no “Status” text). Uses recruiters from storage to filter Active/Inactive/All
// • Period drilldown: Year → Months → Weeks → Days → Shifts (week level restored)

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import {
  load, K, DEFAULT_SETTINGS, rateForDate,
  fmtISO, fmtUK, startOfWeekMon, weekNumberISO, monthKey, monthLabel, toMoney
} from "../util";
import { ChevronLeft, ChevronRight } from "lucide-react";

const roleHoursDefault = (role) => role === "Pool Captain" ? 7 : (role === "Team Captain" || role === "Sales Manager") ? 8 : 6;
const rookieCommission = (box2) => { const t = {0:0,1:0,2:25,3:40,4:70,5:85,6:120,7:135,8:175,9:190,10:235}; return box2 <= 10 ? (t[box2] ?? 0) : 235 + (box2 - 10) * 15; };
const profitColor = (v) => (v > 0 ? "#10b981" : v < 0 ? "#ef4444" : undefined);

export default function Finances({ history }) {
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [status, setStatus] = useState("all"); // active/inactive/all
  const [openYear, setOpenYear] = useState(true);
  const [openMonth, setOpenMonth] = useState({});
  const [openWeek, setOpenWeek] = useState({});
  const [openDay, setOpenDay] = useState({});

  const settings = load(K.settings, DEFAULT_SETTINGS);
  const recruiters = load(K.recruiters, []); // for status filtering

  const inactiveSet = useMemo(() => new Set(recruiters.filter(r => r.isInactive).map(r => r.id)), [recruiters]);
  const activeSet = useMemo(() => new Set(recruiters.filter(r => !r.isInactive).map(r => r.id)), [recruiters]);

  const calcIncome = (row) => {
    const type = row.shiftType === "EVENT" ? "EVENT" : "D2D";
    const m = (settings.conversionType || DEFAULT_SETTINGS.conversionType)[type];
    const b2n = Number(row.box2_noDisc) || 0, b2d = Number(row.box2_disc) || 0;
    const b4n = Number(row.box4_noDisc) || 0, b4d = Number(row.box4_disc) || 0;
    return b2n * (m.noDiscount?.box2 || 0) + b2d * (m.discount?.box2 || 0)
         + b4n * (m.noDiscount?.box4 || 0) + b4d * (m.discount?.box4 || 0);
  };
  const calcPay = (row) => {
    const hrs = (row.hours !== "" && row.hours != null) ? Number(row.hours) : roleHoursDefault(row.roleAtShift || "Rookie");
    const rate = rateForDate(settings, row.dateISO);
    return hrs * rate;
  };
  const calcBonus = (row, roleAtShift) => {
    const box2 = (Number(row.box2_noDisc) || 0) + (Number(row.box2_disc) || 0);
    const mult = (row.commissionMult !== "" && row.commissionMult != null)
      ? Number(row.commissionMult)
      : (roleAtShift === "Pool Captain" ? 1.25 : roleAtShift === "Team Captain" ? 1.5 : roleAtShift === "Sales Manager" ? 2.0 : 1.0);
    return rookieCommission(box2) * mult;
  };

  // Filter rows by year and status
  const rowsYear = useMemo(() => {
    const start = `${year}-01-01`, end = `${year}-12-31`;
    const rows = history.filter(h => (h.dateISO || h.date) >= start && (h.dateISO || h.date) <= end);
    // Status filtering via recruiterId membership
    const filtered = rows.filter(r => {
      const id = r.recruiterId;
      if (!id) return status === "all";
      if (status === "active") return activeSet.has(id);
      if (status === "inactive") return inactiveSet.has(id);
      return true;
    });
    // De-dup
    const map = new Map();
    filtered.forEach(r => {
      const key = `${r.recruiterId || ""}|${r.dateISO || r.date}|${r._rowKey ?? -1}`;
      if (!map.has(key)) map.set(key, r);
    });
    return Array.from(map.values());
  }, [history, year, status, activeSet, inactiveSet]);

  // GROUP: Month → Week → Day
  const byMonth = useMemo(() => {
    const out = {};
    rowsYear.forEach(r => {
      const ym = monthKey(r.dateISO || r.date);
      (out[ym] ||= []).push(r);
    });
    return out;
  }, [rowsYear]);

  const summarizeRows = (rows) => {
    let shifts = 0, score = 0, box2 = 0, box4 = 0, wages = 0, income = 0, bonus = 0;
    let b2n=0,b2d=0,b4n=0,b4d=0;
    const detail = rows.map(r => {
      const inc = calcIncome(r);
      const wag = calcPay(r);
      const bon = calcBonus(r, r.roleAtShift);
      const _b2n = Number(r.box2_noDisc) || 0, _b2d = Number(r.box2_disc) || 0;
      const _b4n = Number(r.box4_noDisc) || 0, _b4d = Number(r.box4_disc) || 0;
      const _score = Number(r.score) || 0;
      const profit = inc - (wag + bon);
      b2n += _b2n; b2d += _b2d; b4n += _b4n; b4d += _b4d;
      shifts += 1; score += _score; box2 += (_b2n + _b2d); box4 += (_b4n + _b4d);
      wages += wag; income += inc; bonus += bon;
      return { ...r, score: _score, income: inc, wages: wag, bonus: bon, profit, b2n:_b2n, b2d:_b2d, b4n:_b4n, b4d:_b4d };
    });
    return { shifts, score, box2, box4, wages, income, bonus, profit: income - (wages + bonus), b2n,b2d,b4n,b4d, detail };
  };

  const yearTotals = summarizeRows(rowsYear);
  const ymKeys = Object.keys(byMonth).sort();

  const shiftYear = (delta) => setYear(y => y + delta);

  return (
    <div className="grid gap-4">
      {/* Year + Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => shiftYear(-1)}><ChevronLeft className="h-4 w-4" /> Prev</Button>
          <div className="px-2.5 py-1 rounded-md font-medium" style={{ background: "black", color: "white" }}>{year}</div>
          <Button variant="outline" onClick={() => shiftYear(1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          {/* no “Status” label text */}
          <select className="h-10 border rounded-md px-2" value={status} onChange={(e)= style={{background:"black",color:"white"}}>setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* YEAR SUMMARY */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-2 text-left">Year</th>
              <th className="p-2 text-right">Shifts</th>
              <th className="p-2 text-right">Score</th>
              <th className="p-2 text-right">Box 2</th>
              <th className="p-2 text-right">Box 2*</th>
              <th className="p-2 text-right">Box 4</th>
              <th className="p-2 text-right">Box 4*</th>
              <th className="p-2 text-right">Pay</th>
              <th className="p-2 text-right">Income</th>
              <th className="p-2 text-right">Profit</th>
              <th className="p-2 text-right">Period</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="p-2">{year}</td>
              <td className="p-2 text-right">{yearTotals.shifts}</td>
              <td className="p-2 text-right">{yearTotals.score}</td>
              <td className="p-2 text-right">{yearTotals.b2n}</td>
              <td className="p-2 text-right">{yearTotals.b2d}</td>
              <td className="p-2 text-right">{yearTotals.b4n}</td>
              <td className="p-2 text-right">{yearTotals.b4d}</td>
              <td className="p-2 text-right">€{toMoney(yearTotals.wages)}</td>
              <td className="p-2 text-right">€{toMoney(yearTotals.income)}</td>
              <td className="p-2 text-right" style={{ color: profitColor(yearTotals.profit) }}>€{toMoney(yearTotals.profit)}</td>
              <td className="p-2 text-right">
                <Button size="sm" variant="outline" onClick={() => setOpenYear(v => !v)}>
                  {openYear ? "Hide" : "Months"}
                </Button>
              </td>
            </tr>

            {openYear && ymKeys.map(ym => {
              const monthRows = byMonth[ym];
              // group by week within the month
              const byWeek = {};
              monthRows.forEach(r => {
                const wk = `${ym}-W${String(weekNumberISO(new Date(r.dateISO || r.date))).padStart(2,"0")}`;
                (byWeek[wk] ||= []).push(r);
              });
              const wkKeys = Object.keys(byWeek).sort();
              const monthSum = summarizeRows(monthRows);

              return (
                <React.Fragment key={ym}>
                  {/* MONTH ROW */}
                  <tr className="border-t bg-zinc-50/50">
                    <td className="p-2 pl-6 font-medium">{monthLabel(ym)}</td>
                    <td className="p-2 text-right">{monthSum.shifts}</td>
                    <td className="p-2 text-right">{monthSum.score}</td>
                    <td className="p-2 text-right">{monthSum.b2n}</td>
                    <td className="p-2 text-right">{monthSum.b2d}</td>
                    <td className="p-2 text-right">{monthSum.b4n}</td>
                    <td className="p-2 text-right">{monthSum.b4d}</td>
                    <td className="p-2 text-right">€{toMoney(monthSum.wages)}</td>
                    <td className="p-2 text-right">€{toMoney(monthSum.income)}</td>
                    <td className="p-2 text-right" style={{ color: profitColor(monthSum.profit) }}>€{toMoney(monthSum.profit)}</td>
                    <td className="p-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => setOpenMonth(s => ({ ...s, [ym]: !s[ym] }))}>
                        {openMonth[ym] ? "Hide" : "Weeks"}
                      </Button>
                    </td>
                  </tr>

                  {/* WEEKS INSIDE MONTH */}
                  {openMonth[ym] && wkKeys.map(wk => {
                    const weekRows = byWeek[wk];
                    const byDay = {};
                    weekRows.forEach(r => { (byDay[r.dateISO || r.date] ||= []).push(r); });
                    const dKeys = Object.keys(byDay).sort();
                    const weekSum = summarizeRows(weekRows);

                    return (
                      <React.Fragment key={wk}>
                        <tr className="border-t">
                          <td className="p-2 pl-10">{wk.replace(`${ym}-`,"")}</td>
                          <td className="p-2 text-right">{weekSum.shifts}</td>
                          <td className="p-2 text-right">{weekSum.score}</td>
                          <td className="p-2 text-right">{weekSum.b2n}</td>
                          <td className="p-2 text-right">{weekSum.b2d}</td>
                          <td className="p-2 text-right">{weekSum.b4n}</td>
                          <td className="p-2 text-right">{weekSum.b4d}</td>
                          <td className="p-2 text-right">€{toMoney(weekSum.wages)}</td>
                          <td className="p-2 text-right">€{toMoney(weekSum.income)}</td>
                          <td className="p-2 text-right" style={{ color: profitColor(weekSum.profit) }}>€{toMoney(weekSum.profit)}</td>
                          <td className="p-2 text-right">
                            <Button size="sm" variant="outline" onClick={() => setOpenWeek(s => ({ ...s, [wk]: !s[wk] }))}>
                              {openWeek[wk] ? "Hide" : "Days"}
                            </Button>
                          </td>
                        </tr>

                        {/* DAYS INSIDE WEEK */}
                        {openWeek[wk] && dKeys.map(dk => {
                          const dSum = summarizeRows(byDay[dk]);
                          return (
                            <React.Fragment key={dk}>
                              <tr className="border-t">
                                <td className="p-2 pl-14">{fmtUK(dk)}</td>
                                <td className="p-2 text-right">{dSum.shifts}</td>
                                <td className="p-2 text-right">{dSum.score}</td>
                                <td className="p-2 text-right">{dSum.b2n}</td>
                                <td className="p-2 text-right">{dSum.b2d}</td>
                                <td className="p-2 text-right">{dSum.b4n}</td>
                                <td className="p-2 text-right">{dSum.b4d}</td>
                                <td className="p-2 text-right">€{toMoney(dSum.wages)}</td>
                                <td className="p-2 text-right">€{toMoney(dSum.income)}</td>
                                <td className="p-2 text-right" style={{ color: profitColor(dSum.profit) }}>€{toMoney(dSum.profit)}</td>
                                <td className="p-2 text-right">
                                  <Button size="sm" variant="outline" onClick={() => setOpenDay(s => ({ ...s, [dk]: !s[dk] }))}>
                                    {openDay[dk] ? "Hide" : "Shifts"}
                                  </Button>
                                </td>
                              </tr>

                              {/* SHIFTS INSIDE DAY */}
                              {openDay[dk] && (
                                <tr>
                                  <td colSpan={11} className="p-0">
                                    <div className="px-3 pb-3">
                                      <div className="overflow-x-auto border rounded-lg">
                                        <table className="min-w-full text-sm">
                                          <thead className="bg-zinc-50">
                                            <tr>
                                              <th className="p-2 text-left">Recruiter</th>
                                              <th className="p-2 text-right">Score</th>
                                              <th className="p-2 text-right">Box 2</th>
                                              <th className="p-2 text-right">Box 2*</th>
                                              <th className="p-2 text-right">Box 4</th>
                                              <th className="p-2 text-right">Box 4*</th>
                                              <th className="p-2 text-right">Pay</th>
                                              <th className="p-2 text-right">Income</th>
                                              <th className="p-2 text-right">Bonus</th>
                                              <th className="p-2 text-right">Profit</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {dSum.detail.map((r, i) => {
                                              const income = r.income, wages = r.wages, bonus = r.bonus;
                                              const profit = income - (wages + bonus);
                                              return (
                                                <tr key={`${r.recruiterId || i}_${r._rowKey || i}`} className="border-t">
                                                  <td className="p-2">{r.recruiterName || r.recruiterId || "•"}</td>
                                                  <td className="p-2 text-right">{r.score}</td>
                                                  <td className="p-2 text-right">{r.b2n}</td>
                                                  <td className="p-2 text-right">{r.b2d}</td>
                                                  <td className="p-2 text-right">{r.b4n}</td>
                                                  <td className="p-2 text-right">{r.b4d}</td>
                                                  <td className="p-2 text-right">€{toMoney(wages)}</td>
                                                  <td className="p-2 text-right">€{toMoney(income)}</td>
                                                  <td className="p-2 text-right">€{toMoney(bonus)}</td>
                                                  <td className="p-2 text-right" style={{ color: profitColor(profit) }}>€{toMoney(profit)}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
