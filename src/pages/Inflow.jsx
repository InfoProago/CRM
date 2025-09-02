
import React, { useMemo, useState } from 'react'
import { K, load, save, normalizeIndeed, toDDMMYYYY, formatPhone, isValidLux, renderTemplate, defaultTemplates, getNotifyCfg, sanitizeNumeric, audit } from '../util/helpers.js'

const newRow = () => ({ name:'', email:'', phone:'', stage:'Lead', calls:0, interview:{date:'',time:''}, formation:{date:'',time:''} })

export default function Inflow(){
  const [rows, setRows] = useState(load(K.leads, [])||[])
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(newRow())
  const [fileErr, setFileErr] = useState('')

  const saveRows = (arr)=>{ setRows(arr); save(K.leads, arr) }

  const sections = useMemo(()=>({
    Leads: rows.filter(r=>r.stage==='Lead'),
    Interview: rows.filter(r=>r.stage==='Interview'),
    Formation: rows.filter(r=>r.stage==='Formation'),
  }), [rows])

  const importJSON = async (e)=>{
    const f = e.target.files?.[0]; if(!f) return
    try{
      const json = JSON.parse(await f.text())
      const rec = normalizeIndeed(json)
      if (!rec?.name && !rec?.email && !rec?.phone) throw new Error('Invalid')
      const row = { ...newRow(), name: rec.name, email: rec.email, phone: formatPhone(rec.phone) }
      saveRows([row, ...rows]); audit('inflow_import', { source:'indeed', row })
      setFileErr('')
    }catch(err){
      setFileErr('Invalid JSON file.')
    }
    e.target.value = ''
  }

  const incCalls = (i)=>{
    const arr = rows.slice()
    const v = arr[i].calls||0
    if (v>=3) return
    arr[i].calls = v+1
    saveRows(arr); audit('calls_inc', { name:arr[i].name, calls:arr[i].calls })
  }

  const setField = (i, patch)=>{
    const arr = rows.slice()
    arr[i] = { ...arr[i], ...patch }
    saveRows(arr)
  }

  const startAdd = ()=>{ setDraft(newRow()); setAdding(true) }
  const commitAdd = ()=>{
    const rec = { ...draft, phone: formatPhone(draft.phone) }
    if (rec.phone.startsWith('+352') && !isValidLux(rec.phone.replace(/\s+/g,''))) {
      alert('Luxembourg numbers must be +352 followed by 9 digits'); return
    }
    saveRows([rec, ...rows]); setAdding(false); audit('inflow_add', rec)
  }

  const NotifyBtn = ({r})=>{
    const canInterview = r.stage==='Interview' && r.interview?.date && r.interview?.time
    const canFormation = r.stage==='Formation' && r.formation?.date && r.formation?.time
    const canCalls = r.calls===3
    if (!canInterview && !canFormation && !canCalls) return null

    const onClick = ()=>{
      const vars = { name:r.name, date:(r.interview?.date||r.formation?.date||toDDMMYYYY(new Date())), time:(r.interview?.time||r.formation?.time||'') }
      const tpls = defaultTemplates()
      const cfg = getNotifyCfg()
      let email, sms
      if (canInterview){ email = renderTemplate(tpls.interview.email, vars); sms = renderTemplate(tpls.interview.sms, vars) }
      else if (canFormation){ email = renderTemplate(tpls.formation.email, vars); sms = renderTemplate(tpls.formation.sms, vars) }
      else { email = renderTemplate(tpls.call.email, vars); sms = renderTemplate(tpls.call.sms, vars) }
      alert(`From Email: ${cfg?.defaults?.email||'default'}\nFrom SMS: ${cfg?.defaults?.sms||'default'}\n\nEMAIL PREVIEW:\n\n${email}\n\nSMS PREVIEW:\n\n${sms}`)
      audit('notify_preview', { vars, stage:r.stage, calls:r.calls })
    }
    return <button className="btn btn-dark" onClick={onClick}>Notify</button>
  }

  const Section = ({name, list})=>(
    <div className="card" style={{marginBottom:12}}>
      <div style={{fontWeight:800, fontSize:18, marginBottom:6}}>{name}</div>
      <table className="table">
        <thead>
          <tr>
            <th className="th">Name</th>
            <th className="th">Email</th>
            <th className="th">Phone</th>
            <th className="th">Calls</th>
            {name!=='Leads' && <th className="th">Date</th>}
            {name!=='Leads' && <th className="th">Time</th>}
            <th className="th">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r,idx)=>{
            const i = rows.indexOf(r)
            return (
              <tr key={i}>
                <td className="td">{r.name}</td>
                <td className="td"><input value={r.email||''} onChange={e=>setField(i,{email:e.target.value})}/></td>
                <td className="td">
                  <input value={r.phone||''}
                    onChange={e=>setField(i,{phone:e.target.value})}
                    onBlur={e=>setField(i,{phone:formatPhone(e.target.value)})}/>
                </td>
                <td className="td">
                  <button className="btn btn-ghost" onClick={()=>incCalls(i)}>{r.calls||0}</button>
                </td>
                {name!=='Leads' && (
                  <td className="td"><input placeholder="dd-mm-yyyy" value={(name==='Interview'?r.interview?.date:r.formation?.date)||''}
                    onChange={e=>{
                      const v=e.target.value
                      if (name==='Interview') setField(i,{ interview:{...(r.interview||{}), date:v} })
                      else setField(i,{ formation:{...(r.formation||{}), date:v} })
                    }}/></td>
                )}
                {name!=='Leads' && (
                  <td className="td"><input placeholder="hh:mm" value={(name==='Interview'?r.interview?.time:r.formation?.time)||''}
                    onChange={e=>{
                      const v=e.target.value
                      if (name==='Interview') setField(i,{ interview:{...(r.interview||{}), time:v} })
                      else setField(i,{ formation:{...(r.formation||{}), time:v} })
                    }}/></td>
                )}
                <td className="td" style={{display:'flex', gap:6}}>
                  <NotifyBtn r={r}/>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div>
      <div className="row" style={{gap:8, marginBottom:10}}>
        <button className="btn btn-white" onClick={startAdd}>Add</button>
        <label className="btn btn-white">Import
          <input type="file" accept="application/json" style={{display:'none'}} onChange={importJSON}/>
        </label>
        {fileErr && <span className="danger-text">{fileErr}</span>}
      </div>

      {adding && (
        <div className="card" style={{maxWidth:520}}>
          <div className="col">
            <label>Name</label>
            <input value={draft.name} onChange={e=>setDraft({...draft, name:e.target.value})}/>
            <label>Email</label>
            <input value={draft.email} onChange={e=>setDraft({...draft, email:e.target.value})}/>
            <label>Phone</label>
            <input value={draft.phone} onChange={e=>setDraft({...draft, phone:e.target.value})}
              onBlur={e=>setDraft({...draft, phone:formatPhone(e.target.value)})}/>
            <div className="row" style={{justifyContent:'flex-end', gap:8}}>
              <button className="btn btn-ghost" onClick={()=>setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={commitAdd}>Save</button>
            </div>
          </div>
        </div>
      )}

      <Section name="Leads" list={sections.Leads}/>
      <Section name="Interview" list={sections.Interview}/>
      <Section name="Formation" list={sections.Formation}/>
    </div>
  )
}
