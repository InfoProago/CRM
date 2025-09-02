
import React, { useMemo, useState } from 'react'
import { K, load, save, toDDMMYYYY, factorFromPercent, scoreClass, sanitizeNumeric, audit } from '../util/helpers.js'

const defaultDay = (date)=> ({ date, teams:[] })

export default function Planning(){
  const [days, setDays] = useState(load(K.planning, [])||[])
  const [editingIdx, setEditingIdx] = useState(null)
  const [draft, setDraft] = useState(null)

  const saveDays = (arr)=> { setDays(arr); save(K.planning, arr) }

  const today = toDDMMYYYY(new Date())

  const openEdit = (when)=>{
    const idx = days.findIndex(d=>d.date===when)
    if (idx>=0){ setEditingIdx(idx); setDraft(JSON.parse(JSON.stringify(days[idx]))); }
    else { const nd = defaultDay(when); const arr=[...days, nd]; saveDays(arr); setEditingIdx(arr.length-1); setDraft(JSON.parse(JSON.stringify(nd))) }
  }

  const addTeam = ()=>{
    const d = JSON.parse(JSON.stringify(draft))
    d.teams.push({ name:'Team', zones:['','',''], members:[], mult:'100%' })
    setDraft(d)
  }

  const addMember = (ti)=>{
    const d = JSON.parse(JSON.stringify(draft))
    const t = d.teams[ti]
    if ((t.members||[]).length>=3) return
    t.members = t.members || []
    t.members.push({ name:'', hours:'0', score:'0', b2:'0', b2s:'0', b4:'0', b4s:'0', game:'0' })
    setDraft(d)
  }

  const setTeamField = (ti, patch)=>{
    const d = JSON.parse(JSON.stringify(draft))
    d.teams[ti] = { ...d.teams[ti], ...patch }
    setDraft(d)
  }
  const setMemberField = (ti, mi, key, value)=>{
    const d = JSON.parse(JSON.stringify(draft))
    let v = value
    if (['hours','score','b2','b2s','b4','b4s','game'].includes(key)) v = sanitizeNumeric(v)
    const m = { ...d.teams[ti].members[mi], [key]: v }
    // pair-wise validation against score
    const s = Number(String(m.score).replace(',','.'))||0
    const b2 = Number(String(m.b2).replace(',','.'))||0
    const b2s = Number(String(m.b2s).replace(',','.'))||0
    const b4 = Number(String(m.b4).replace(',','.'))||0
    const b4s = Number(String(m.b4s).replace(',','.'))||0
    if (b2 + b2s > s) m.b2s = String(Math.max(0, s - b2))
    if (b4 + b4s > s) m.b4s = String(Math.max(0, s - b4))
    d.teams[ti].members[mi] = m
    setDraft(d)
  }

  const commit = ()=>{
    const arr = days.slice()
    arr[editingIdx] = draft
    saveDays(arr); setEditingIdx(null); setDraft(null)
    audit('planning_save_day', { date: arr[editingIdx]?.date })
  }

  const current = days.find(d=>d.date===today)
  const dayAvg = useMemo(()=>{
    if (!current) return '0.00'
    const all = (current.teams||[]).flatMap(t=>t.members||[])
    const n = all.length || 1
    const total = all.reduce((a,m)=> a + (Number(String(m.score).replace(',','.'))||0), 0)
    return (total / n).toFixed(2)
  }, [days])

  const zonesBlock = (zones=[])=> zones.filter(Boolean).map((z,i)=>(<div key={i}>{z}</div>))

  return (
    <div>
      <div className="row" style={{alignItems:'baseline', marginBottom:8}}>
        <div style={{fontWeight:800, fontSize:20}}>Planning</div>
        <div className="bullet">•</div>
        <div>Week Average: <b>{dayAvg}</b></div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <div className="row">
          <button className="btn btn-black" onClick={()=>openEdit(today)}>Edit Day</button>
          <div style={{flex:1}} />
          <button className="btn btn-white">Sales Mail PDF</button>
          <button className="btn btn-white">Quality Mail PDF</button>
          <button className="btn btn-white">Team Prep Mail PDF</button>
        </div>
      </div>

      {editingIdx!==null && (
        <div className="card">
          <div style={{fontWeight:800, fontSize:18, marginBottom:8}}>Edit Day • {draft.date}</div>
          <div className="row" style={{marginBottom:10}}>
            <button className="btn btn-black" onClick={addTeam}>Add Team</button>
          </div>

          {(draft.teams||[]).map((t, ti)=>(
            <div key={ti} className="card" style={{marginBottom:12}}>
              <div className="row" style={{gap:12, flexWrap:'wrap', marginBottom:8}}>
                <div className="col" style={{minWidth:160}}>
                  <label>Team</label>
                  <input value={t.name} onChange={e=>setTeamField(ti,{name:e.target.value})}/>
                </div>
                <div className="col" style={{minWidth:180}}>
                  <label>Zone 1</label>
                  <input value={t.zones?.[0]||''} onChange={e=>{ const z=[...(t.zones||['','',''])]; z[0]=e.target.value; setTeamField(ti,{zones:z}) }}/>
                </div>
                <div className="col" style={{minWidth:180}}>
                  <label>Zone 2</label>
                  <input value={t.zones?.[1]||''} onChange={e=>{ const z=[...(t.zones||['','',''])]; z[1]=e.target.value; setTeamField(ti,{zones:z}) }}/>
                </div>
                <div className="col" style={{minWidth:180}}>
                  <label>Zone 3</label>
                  <input value={t.zones?.[2]||''} onChange={e=>{ const z=[...(t.zones||['','',''])]; z[2]=e.target.value; setTeamField(ti,{zones:z}) }}/>
                </div>
                <div className="col" style={{minWidth:120}}>
                  <label>Mult</label>
                  <select value={t.mult||'100%'} onChange={e=>setTeamField(ti,{mult:e.target.value})}>
                    {['100%','125%','150%','200%'].map(p=>(<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div className="row" style={{marginLeft:'auto'}}>
                  <button className="btn btn-black" onClick={()=>addMember(ti)}>Add Recruiter</button>
                </div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th className="th" style={{width:220}}>Recruiter</th>
                    <th className="th" style={{width:90}}>Hours</th>
                    <th className="th" style={{width:90}}>Score</th>
                    <th className="th" style={{width:90}}>Box 2</th>
                    <th className="th" style={{width:90}}>Box 2*</th>
                    <th className="th" style={{width:90}}>Box 4</th>
                    <th className="th" style={{width:90}}>Box 4*</th>
                    <th className="th" style={{width:120}}>Game</th>
                  </tr>
                </thead>
                <tbody>
                  {(t.members||[]).map((m, mi)=>(
                    <tr key={mi}>
                      <td className="td"><input value={m.name} onChange={e=>setMemberField(ti,mi,'name',e.target.value)}/></td>
                      <td className="td"><input value={m.hours} onChange={e=>setMemberField(ti,mi,'hours',e.target.value)}/></td>
                      <td className="td"><input value={m.score} onChange={e=>setMemberField(ti,mi,'score',e.target.value)}/></td>
                      <td className="td"><input value={m.b2} onChange={e=>setMemberField(ti,mi,'b2',e.target.value)}/></td>
                      <td className="td"><input value={m.b2s} onChange={e=>setMemberField(ti,mi,'b2s',e.target.value)}/></td>
                      <td className="td"><input value={m.b4} onChange={e=>setMemberField(ti,mi,'b4',e.target.value)}/></td>
                      <td className="td"><input value={m.b4s} onChange={e=>setMemberField(ti,mi,'b4s',e.target.value)}/></td>
                      <td className="td"><input value={m.game} onChange={e=>setMemberField(ti,mi,'game',e.target.value)}/></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <div className="row" style={{justifyContent:'flex-end', gap:8}}>
            <button className="btn btn-ghost" onClick={()=>{setEditingIdx(null); setDraft(null)}}>Cancel</button>
            <button className="btn btn-primary" onClick={commit}>Save</button>
          </div>
        </div>
      )}

      {current && (current.teams||[]).length>0 && (
        <div className="card">
          <div style={{fontWeight:800, marginBottom:8}}>{current.date}</div>
          {(current.teams||[]).map((t,ti)=>(
            <div key={ti} className="card" style={{marginBottom:10}}>
              <div>{zonesBlock(t.zones)}</div>
              <div className="divider"></div>
              <div>
                {(t.members||[]).map((m,mi)=>{
                  const parts = String(m.name||'').trim().split(/\s+/)
                  const first = parts.shift()||''
                  const last = parts.join(' ')
                  return (<div key={mi}><div>{first}</div><div>{last}</div></div>)
                })}
              </div>
            </div>
          ))}
          <div className="row" style={{gap:6}}><div className="muted">Average:</div><b>{dayAvg}</b></div>
        </div>
      )}
    </div>
  )
}
