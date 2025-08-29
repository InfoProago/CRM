// Wages.jsx — Proago CRM (v2025-08-29i)
// Changes:
// • Heading remains “Wages from July 2025 • Bonus from June 2025” (dynamic)
// • Remove literal “Status” label (selector kept)
// • Balanced column widths via table-fixed/colgroup

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import {
  load, K, DEFAULT_SETTINGS, rateForDate,
  monthKey, monthLabel, toMoney
} from "../util";

const rookieCommission = (box2) => { const t = {0:0,1:0,2:25,3:40,4:70,5:85,6:120,7:135,8:175,9:190,10:235}; return box2 <= 10 ? (t[box2] ?? 0) : 235 + (box2 - 10) * 15; };
const roleHoursDefault = (role) => role === "Pool Captain" ? 7 : (role === "Team Captain" || role === "Sales Manager") ? 8 : 6;
const roleMultiplierDefault = (role) => role === "Pool Captain" ? 1.25 : role === "Team Captain" ? 1.5 : role === "Sales Manager" ? 2.0 : 1.0;

const prevMonthKey = (ym) => { const [Y, M] = ym.split("-").map(Number); const d = new Date(Date.UTC(Y, M - 1, 1)); d.setUTCMonth(d.getUTCMonth() - 1); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
const currentMonthKey = () => { const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };

export default function Wages({ recruiters, history }) {
  const [payMonth, setPayMonth] = useState(currentMonthKey());
  const [status, setStatus] = useState("all"); // active/inactive/all
  const [open, setOpen] = useState({}); // recruiterId => bool

  const wagesMonth = useMemo(() => prevMonthKey(payMonth), [payMonth]);
  const bonusMonth = useMemo(() => prevMonthKey(wagesMonth), [wagesMonth]);

  const settings = load(K.settings, DEFAULT_SETTINGS);
  const inMonth = (iso, ym) => monthKey(iso) === ym;

  const rows = useMemo(() => {
    return recruiters
      .filter(r => status === "all" ? true : status === "active" ? !r.isInactive : !!r.isInactive)
      .map(r => {
        const wageShifts = history
          .filter(h => h.recruiterId === r.id && inMonth(h.dateISO || h.date, wagesMonth))
          .map(h => {
            const hrs = (h.hours != null && h.hours !== "") ? Number(h.hours) : roleHoursDefault(h.roleAtShift || r.role || "Rookie");
            const rate = rateForDate(settings, h.dateISO || h.date);
            const wages = hrs * rate;
            return { dateISO: h.dateISO || h.date, location: h.location || "—", hrs, rate, wages };
          });
        const wages = wageShifts.reduce((s, x) => s + (Number.isFinite(x.wages) ? x.wages : 0), 0);

        const bonusShifts = history
          .filter(h => h.recruiterId === r.id && inMonth(h.dateISO || h.date, bonusMonth))
          .map(h => {
            const box2 = (Number(h.box2_noDisc) || 0) + (Number(h.box2_disc) || 0);
            const mult = (h.commissionMult != null && h.commissionMult !== "")
              ? Number(h.commissionMult)
              : roleMultiplierDefault(h.roleAtShift || r.role || "Rookie");
            const base = rookieCommission(box2);
            const bonus = base * mult;
            return { dateISO: h.dateISO || h.date, location: h.location || "—", box2, mult, bonus };
          });
        const bonus = bonusShifts.reduce((s, x) => s + (Number.isFinite(x.bonus) ? x.bonus : 0), 0);

        return { recruiter: r, wages, bonus, wageShifts, bonusShifts };
      });
  }, [recruiters, history, status, settings, wagesMonth, bonusMonth]);

  const monthShift = (delta) => {
    const [y, m] = payMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    d.setUTCMonth(d.getUTCMonth() + delta);
    setPayMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="grid gap-4">
      {/* Header controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => monthShift(-1)}><ChevronLeft className="h-4 w-4" /> Prev</Button>
          <Badge style={{ background: "#fca11c" }}>{monthLabel(payMonth)}</Badge>
          <Button variant="outline" onClick={() => monthShift(1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex gap-2 items-center">
          {/* removed explicit “Status” label */}
          <select className="h-10 border rounded-md px-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {/* Heading line */}
      <div className="text-sm text-muted-foreground">
        <span>Wages from <b>{monthLabel(wagesMonth)}</b></span>{" • "}
        <span>Bonus from <b>{monthLabel(bonusMonth)}</b></span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: "36%" }} /> {/* Name */}
            <col style={{ width: "16%" }} /> {/* Wages */}
            <col style={{ width: "16%" }} /> {/* Bonus */}
            <col style={{ width: "16%" }} /> {/* Total */}
            <col style={{ width: "16%" }} /> {/* Details */}
          </colgroup>
        <thead className="bg-zinc-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-right">Wages</th>
              <th className="p-3 text-right">Bonus</th>
              <th className="p-3 text-right">Total Pay</th>
              <th className="p-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ recruiter: r, wages, bonus, wageShifts, bonusShifts }) => {
              const total = wages + bonus;
              return (
                <React.Fragment key={r.id}>
                  <tr className="border-t">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 text-right">€{toMoney(wages)}</td>
                    <td className="p-3 text-right">€{toMoney(bonus)}</td>
                    <td className="p-3 text-right font-medium">€{toMoney(total)}</td>
                    <td className="p-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => setOpen(o => ({ ...o, [r.id]: !o[r.id] }))}>
                        {open[r.id] ? "Hide" : "View"} <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </td>
                  </tr>

                  {open[r.id] && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className="px-3 pb-3">
                          <div className="grid md:grid-cols-2 gap-3">
                            {/* Wages breakdown */}
                            <div className="border rounded-lg overflow-hidden">
                              <div className="px-3 py-2 bg-zinc-50 font-medium">Wages — {monthLabel(wagesMonth)}</div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm table-fixed">
                                  <colgroup>
                                    <col style={{ width: "24%" }} /> {/* Date */}
                                    <col style={{ width: "24%" }} /> {/* Zone */}
                                    <col style={{ width: "16%" }} /> {/* Hours */}
                                    <col style={{ width: "16%" }} /> {/* Rate */}
                                    <col style={{ width: "20%" }} /> {/* Wages */}
                                  </colgroup>
                                  <thead className="bg-zinc-50">
                                    <tr>
                                      <th className="p-2 text-left">Date</th>
                                      <th className="p-2 text-left">Zone</th>
                                      <th className="p-2 text-right">Hours</th>
                                      <th className="p-2 text-right">Rate</th>
                                      <th className="p-2 text-right">Wages</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {wageShifts.map((s, i) => (
                                      <tr key={i} className="border-t">
                                        <td className="p-2">{(s.dateISO || "").slice(8,10)}/{(s.dateISO || "").slice(5,7)}/{(s.dateISO || "").slice(2,4)}</td>
                                        <td className="p-2">{s.location}</td>
                                        <td className="p-2 text-right">{s.hrs}</td>
                                        <td className="p-2 text-right">€{toMoney(s.rate)}</td>
                                        <td className="p-2 text-right">€{toMoney(s.wages)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Bonus breakdown */}
                            <div className="border rounded-lg overflow-hidden">
                              <div className="px-3 py-2 bg-zinc-50 font-medium">Bonus — {monthLabel(bonusMonth)}</div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm table-fixed">
                                  <colgroup>
                                    <col style={{ width: "24%" }} /> {/* Date */}
                                    <col style={{ width: "24%" }} /> {/* Zone */}
                                    <col style={{ width: "16%" }} /> {/* Box 2 */}
                                    <col style={{ width: "16%" }} /> {/* Mult */}
                                    <col style={{ width: "20%" }} /> {/* Bonus */}
                                  </colgroup>
                                  <thead className="bg-zinc-50">
                                    <tr>
                                      <th className="p-2 text-left">Date</th>
                                      <th className="p-2 text-left">Zone</th>
                                      <th className="p-2 text-right">Box 2</th>
                                      <th className="p-2 text-right">Mult</th>
                                      <th className="p-2 text-right">Bonus</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {bonusShifts.map((s, i) => (
                                      <tr key={i} className="border-t">
                                        <td className="p-2">{(s.dateISO || "").slice(8,10)}/{(s.dateISO || "").slice(5,7)}/{(s.dateISO || "").slice(2,4)}</td>
                                        <td className="p-2">{s.location}</td>
                                        <td className="p-2 text-right">{s.box2}</td>
                                        <td className="p-2 text-right">{(s.mult || 1).toFixed(2)}×</td>
                                        <td className="p-2 text-right">€{toMoney(s.bonus)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
