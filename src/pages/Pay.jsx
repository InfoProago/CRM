
import React, { useMemo } from 'react'
import { K, load, toMoney } from '../util/helpers.js'

export default function Pay(){
  const days = load(K.planning, [])||[]
  const rows = days.flatMap(d => (d.teams||[]).flatMap(t=> (t.members||[]).map(m=>({ date:d.date, team:t.name, mult:t.mult, ...m })) ))

  // Minimal calculation: include Game as requested; wages/bonus formula can be wired to your rules.
  const totalGame = rows.reduce((a,m)=> a + (Number(String(m.game).replace(',','.'))||0), 0)
  const total = totalGame // + wages + bonus (add when formulas ready)

  return (
    <div className="card">
      <div style={{fontWeight:800, fontSize:18, marginBottom:8}}>Pay • Summary</div>
      <div className="row" style={{gap:20}}>
        <div>Game: <b>{toMoney(totalGame)}</b></div>
        <div>Total Pay: <b>{toMoney(total)}</b></div>
      </div>
      <div className="sep"></div>
      <table className="table">
        <thead>
          <tr>
            <th className="th">Date</th>
            <th className="th">Recruiter</th>
            <th className="th">Team</th>
            <th className="th">Mult</th>
            <th className="th">Game</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i)=>(
            <tr key={i}>
              <td className="td">{r.date}</td>
              <td className="td">{r.name}</td>
              <td className="td">{r.team}</td>
              <td className="td">{r.mult}</td>
              <td className="td">{toMoney(Number(String(r.game).replace(',','.'))||0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
