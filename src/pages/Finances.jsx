
import React from 'react'
import { K, load, toMoney } from '../util/helpers.js'

export default function Finances(){
  const days = load(K.planning, [])||[]
  const rows = days.flatMap(d => (d.teams||[]).flatMap(t=> (t.members||[]).map(m=>({ date:d.date, team:t.name, mult:t.mult, ...m })) ))
  const totalGame = rows.reduce((a,m)=> a + (Number(String(m.game).replace(',','.'))||0), 0)

  return (
    <div className="card">
      <div style={{fontWeight:800, fontSize:18, marginBottom:8}}>Finances</div>
      <div className="row" style={{gap:16}}>
        <div>Game total: <b>{toMoney(totalGame)}</b></div>
      </div>
      <div className="sep"></div>
      <div className="muted">Paid vs Operational view will use the Payment Ledger snapshots.</div>
    </div>
  )
}
