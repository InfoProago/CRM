
import React, { useEffect, useState } from 'react'
import { K, load, save, defaultTemplates, getNotifyCfg, setNotifyCfg, mergeSettings_unused } from '../util/helpers.js'

// mergeSettings utility (inline to avoid import cycles if user had one)
const mergeSettings = (patch)=>{
  const cur = load(K.settings, {}) || {}
  const next = { ...cur, ...patch }
  save(K.settings, next)
  return next
}

export default function Settings(){
  const [settings, setSettings] = useState(load(K.settings, {})||{})
  const [notify, setNotify] = useState(getNotifyCfg())
  const [templates, setTemplates] = useState(load(K.templates, null) || defaultTemplates())
  const [recruiterToDelete, setRecruiterToDelete] = useState('')

  useEffect(()=>{ if (!settings.rates){
    const next = mergeSettings({
      rates:{ pre20250501:'15,2473', from20250501:'15,6285' },
      conversion:{
        D2D:{ box2:95, box4:125 },
        D2DStar:{ box2s:80, box4s:110 },
        Events:{ box2:60, box4:70 },
        EventsStar:{ box2s:45, box4s:55 }
      }
    })
    setSettings(next)
  }},[])

  const saveTemplates = ()=> save(K.templates, templates)

  const deleteRecruiterEverywhere = ()=>{
    const crew = recruiterToDelete.trim()
    if (!crew) return
    // Leads
    save(K.leads, (load(K.leads,[])||[]).filter(x=>x.crewcode!==crew))
    // Recruiters
    save(K.recruiters, (load(K.recruiters,[])||[]).filter(x=>x.crewcode!==crew))
    // Planning members
    const plan = (load(K.planning,[])||[]).map(d=>({
      ...d,
      teams:(d.teams||[]).map(t=>({...t, members:(t.members||[]).filter(m=>m.crewcode!==crew)}))
    }))
    save(K.planning, plan)
    setRecruiterToDelete('')
    alert('Recruiter deleted across modules.')
  }

  return (
    <div className="col" style={{gap:16}}>
      <div className="card">
        <div style={{fontWeight:800, fontSize:18, marginBottom:8}}>Notifications • Providers</div>
        <div className="grid2">
          <div className="col">
            <label>From Emails</label>
            <textarea rows={3} placeholder="sales@proago.com; hr@proago.com"
              value={(notify.emailFroms||[]).join('; ')}
              onChange={e=>{ const emailFroms=e.target.value.split(';').map(x=>x.trim()).filter(Boolean); const n={...notify, emailFroms}; setNotify(n); setNotifyCfg(n); }}/>
          </div>
          <div className="col">
            <label>From SMS Numbers</label>
            <textarea rows={3} placeholder="+3526..., +3526..."
              value={(notify.smsFroms||[]).join(', ')}
              onChange={e=>{ const smsFroms=e.target.value.split(',').map(x=>x.trim()).filter(Boolean); const n={...notify, smsFroms}; setNotify(n); setNotifyCfg(n); }}/>
          </div>
        </div>
        <div className="row" style={{gap:10}}>
          <div className="col"><label>Default Email</label><input value={notify.defaults?.email||''} onChange={e=>{ const n={...notify, defaults:{...(notify.defaults||{}), email:e.target.value}}; setNotify(n); setNotifyCfg(n); }}/></div>
          <div className="col"><label>Default SMS</label><input value={notify.defaults?.sms||''} onChange={e=>{ const n={...notify, defaults:{...(notify.defaults||{}), sms:e.target.value}}; setNotify(n); setNotifyCfg(n); }}/></div>
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:800, fontSize:18, marginBottom:8}}>Notifications • Templates</div>
        {Object.entries(templates).map(([key,obj])=>(
          <div key={key} className="col" style={{marginBottom:12}}>
            <div style={{fontWeight:800}}>{key[0].toUpperCase()+key.slice(1)}</div>
            <label>Email</label>
            <textarea rows={6} value={obj.email} onChange={e=>{ const t={...templates}; t[key]={...t[key], email:e.target.value}; setTemplates(t) }}/>
            <label>SMS</label>
            <textarea rows={3} value={obj.sms} onChange={e=>{ const t={...templates}; t[key]={...t[key], sms:e.target.value}; setTemplates(t) }}/>
          </div>
        ))}
        <div className="row" style={{justifyContent:'flex-end'}}><button className="btn btn-primary" onClick={saveTemplates}>Save Templates</button></div>
      </div>

      <div className="card">
        <div style={{fontWeight:800, fontSize:18, marginBottom:8}}>Hourly Rate</div>
        <div className="row" style={{gap:10}}>
          <div className="col"><label>Before 01-05-2025</label><input value={settings?.rates?.pre20250501||''} onChange={e=>{ const s={...settings, rates:{...settings.rates, pre20250501:e.target.value}}; setSettings(s); save(K.settings, s) }}/></div>
          <div className="col"><label>From 01-05-2025</label><input value={settings?.rates?.from20250501||''} onChange={e=>{ const s={...settings, rates:{...settings.rates, from20250501:e.target.value}}; setSettings(s); save(K.settings, s) }}/></div>
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:800, fontSize:18, marginBottom:8}}>D2D • Events</div>
        <div className="grid2">
          <div className="col">
            <div style={{fontWeight:800, marginBottom:6}}>D2D</div>
            <div className="row"><div className="col"><label>Box 2</label><input value={settings?.conversion?.D2D?.box2??''} onChange={e=>{ const s={...settings, conversion:{...settings.conversion, D2D:{...settings.conversion?.D2D, box2:e.target.value}}}; setSettings(s); save(K.settings,s) }}/></div>
            <div className="col"><label>Box 4</label><input value={settings?.conversion?.D2D?.box4??''} onChange={e=>{ const s={...settings, conversion:{...settings.conversion, D2D:{...settings.conversion?.D2D, box4:e.target.value}}}; setSettings(s); save(K.settings,s) }}/></div></div>
            <div style={{fontWeight:800, margin:'10px 0 6px'}}>D2D*</div>
            <div className="row"><div className="col"><label>Box 2*</label><input value={settings?.conversion?.D2DStar?.box2s??''} onChange={e=>{ const s={...settings, conversion:{...settings.conversion, D2DStar:{...settings.conversion?.D2DStar, box2s:e.target.value}}}; setSettings(s); save(K.settings,s) }}/></div>
            <div className="col"><label>Box 4*</label><input value={settings?.conversion?.D2DStar?.box4s??''} onChange={e=>{ const s={...settings, conversion:{...settings.conversion, D2DStar:{...settings.conversion?.D2DStar, box4s:e.target.value}}}; setSettings(s); save(K.settings,s) }}/></div></div>
          </div>
          <div className="col">
            <div style={{fontWeight:800, marginBottom:6}}>Events</div>
            <div className="row"><div className="col"><label>Box 2</label><input value={settings?.conversion?.Events?.box2??''} onChange={e=>{ const s={...settings, conversion:{...settings.conversion, Events:{...settings.conversion?.Events, box2:e.target.value}}}; setSettings(s); save(K.settings,s) }}/></div>
            <div className="col"><label>Box 4</label><input value={settings?.conversion?.Events?.box4??''} onChange={e=>{ const s={...settings, conversion:{...settings.conversion, Events:{...settings.conversion?.Events, box4:e.target.value}}}; setSettings(s); save(K.settings,s) }}/></div></div>
            <div style={{fontWeight:800, margin:'10px 0 6px'}}>Events*</div>
            <div className="row"><div className="col"><label>Box 2*</label><input value={settings?.conversion?.EventsStar?.box2s??''} onChange={e=>{ const s={...settings, conversion:{...settings.conversion, EventsStar:{...settings.conversion?.EventsStar, box2s:e.target.value}}}; setSettings(s); save(K.settings,s) }}/></div>
            <div className="col"><label>Box 4*</label><input value={settings?.conversion?.EventsStar?.box4s??''} onChange={e=>{ const s={...settings, conversion:{...settings.conversion, EventsStar:{...settings.conversion?.EventsStar, box4s:e.target.value}}}; setSettings(s); save(K.settings,s) }}/></div></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:800, fontSize:18, marginBottom:8}}>Danger Zone</div>
        <div className="row" style={{gap:8}}>
          <input placeholder="Crewcode to delete" value={recruiterToDelete} onChange={e=>setRecruiterToDelete(e.target.value)}/>
          <button className="btn btn-black" onClick={deleteRecruiterEverywhere}>Delete Recruiter</button>
          <button className="btn btn-white" onClick={()=>alert('Audit Log viewer will open here')}>Audit Log</button>
        </div>
      </div>
    </div>
  )
}
