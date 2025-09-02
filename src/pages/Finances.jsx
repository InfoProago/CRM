import React, { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { fmtUK, load, ensurePercent } from "../util";

export default function Finances() {
  const [status, setStatus] = useState("all");

  const recruiters = load("proago_recruiters_v6", []);
  const history = load("proago_history_v6_discounts", []);

  const filteredRecruiters = useMemo(() => {
    return recruiters.filter((r) =>
      status === "all"
        ? true
        : status === "active"
        ? !r.isInactive
        : !!r.isInactive
    );
  }, [recruiters, status]);

  const rows = useMemo(() => {
    return filteredRecruiters.map((r) => {
      const shifts = history.filter((h) => h.recruiterId === r.id);
      const wages = shifts.reduce((acc, s) => acc + (s.wages || 0), 0);
      const bonus = shifts.reduce((acc, s) => acc + (s.bonus || 0), 0);
      const game = shifts.reduce((acc, s) => acc + (s.game || 0), 0);
      return {
        id: r.id,
        name: r.name,
        wages,
        bonus,
        game,
        total: wages + bonus + game,
        mult: r.commissionMult,
      };
    });
  }, [filteredRecruiters, history]);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Pay • Finances</CardTitle>
          <div className="flex gap-2 items-center">
            <select
              className="h-10 border rounded-md px-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ background: "black", color: "white" }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          <table className="min-w-full text-sm table-auto">
            <thead>
              <tr className="bg-zinc-100 text-left">
                <th className="p-2">Recruiter</th>
                <th className="p-2 text-right">Wages</th>
                <th className="p-2 text-right">Bonus</th>
                <th className="p-2 text-right">Game</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-right">Mult</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">{r.wages.toFixed(2)}</td>
                  <td className="p-2 text-right">{r.bonus.toFixed(2)}</td>
                  <td className="p-2 text-right">{r.game.toFixed(2)}</td>
                  <td className="p-2 text-right font-semibold">
                    {r.total.toFixed(2)}
                  </td>
                  <td className="p-2 text-right">{ensurePercent(r.mult)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

            <Card>
        <CardHeader>
          <CardTitle>Summary • Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full text-sm table-auto">
            <thead>
              <tr className="bg-zinc-100 text-left">
                <th className="p-2">Category</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-2">Total Wages</td>
                <td className="p-2 text-right">
                  {rows.reduce((a, r) => a + r.wages, 0).toFixed(2)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-2">Total Bonus</td>
                <td className="p-2 text-right">
                  {rows.reduce((a, r) => a + r.bonus, 0).toFixed(2)}
                </td>
              </tr>
              <tr className="border-b">
                <td className="p-2">Total Game</td>
                <td className="p-2 text-right">
                  {rows.reduce((a, r) => a + r.game, 0).toFixed(2)}
                </td>
              </tr>
              <tr className="border-b font-semibold">
                <td className="p-2">Grand Total</td>
                <td className="p-2 text-right">
                  {rows.reduce((a, r) => a + r.total, 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History • Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full text-sm table-auto">
            <thead>
              <tr className="bg-zinc-100 text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Recruiter</th>
                <th className="p-2 text-right">Wages</th>
                <th className="p-2 text-right">Bonus</th>
                <th className="p-2 text-right">Game</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => {
                const r = recruiters.find((r) => r.id === h.recruiterId);
                if (!r) return null;
                const total = (h.wages || 0) + (h.bonus || 0) + (h.game || 0);
                return (
                  <tr key={i} className="border-b">
                    <td className="p-2">{fmtUK(h.date)}</td>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-right">
                      {(h.wages || 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      {(h.bonus || 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      {(h.game || 0).toFixed(2)}
                    </td>
                    <td className="p-2 text-right font-semibold">
                      {total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

            <Card>
        <CardHeader>
          <CardTitle>Breakdown • By Recruiter</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full text-sm table-auto">
            <thead>
              <tr className="bg-zinc-100 text-left">
                <th className="p-2">Recruiter</th>
                <th className="p-2 text-right">Wages</th>
                <th className="p-2 text-right">Bonus</th>
                <th className="p-2 text-right">Game</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">{r.wages.toFixed(2)}</td>
                  <td className="p-2 text-right">{r.bonus.toFixed(2)}</td>
                  <td className="p-2 text-right">{r.game.toFixed(2)}</td>
                  <td className="p-2 text-right font-semibold">
                    {r.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
