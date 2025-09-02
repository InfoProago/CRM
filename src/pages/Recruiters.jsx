
import React, { useMemo, useState } from 'react'
import { K, load, save, box2ClassByPct, box4ClassByPct, scoreClass, toDDMMYYYY, audit } from '../util/helpers.js'

const InfoDialog = ({row, onClose, onSave})=>{
  const [name, setName] = useState(row.name||'')
  const [photo, setPhoto] = useState(row.photo||null)
  const [history, setHistory] = useState(row.history||[]) // [{date, project, zones[], score, b2,b2s,b4,b4s, game}]

  const onAddPhoto = (e)=>{
    const f = e.target.files?.[0]; if(!f) return
    const reader = new FileReader()
    reader.onload = ()=> setPhoto(reader.result)
    reader.readAsDataURL(f)
  }
  const onRemovePhoto = ()=> setPhoto(null)

  return (
    <div className="overlay">
      <div className="dialog">
        <div className="row" style={{gap:10, alignItems:'center', marginBottom:8}}>
          <div className="avatar">{photo? <img src={photo} alt="" style={{width:'100%',height:'100%',borderRadius:'999px',objectFit:'cover'}}/> : (name? name[0].toUpperCase(): '?')}</div>
          <div style={{fontWeight:800, fontSize:18}}>Info • {row.name}</div>
          <div className="row" style={{marginLeft:'auto', gap:6}}>
            <label className="btn btn-white">Add<input type="file" accept="image/*" style={{display:'none'}} onChange={onAddPhoto}/></label>
            <button className="btn btn-black" onClick={onRemovePhoto}>Remove</button>
          </div>
        </div>
        <div className="grid2">
          <div className="col">
            <label>Rename Recruiter</label>
            <input value={name} onChange={e=>setName(e.target.value)}/>
          </div>
          <div></div>
        </div>

        <div className="hr"></div>
        <div style={{fontWeight:800, marginBottom:6}}>History</div>
        <table className="table">
          <thead>
            <tr>
              <th className="th" style={{width:120}}>Date</th>
              <th className="th" style={{width:160}}>Project</th>
              <th className="th" style={{width:260}}>Zone</th>
              <th className="th">Score</th>
              <th className="th">Box 2</th>
              <th className="th">Box 2*</th>
              <th className="th">Box 4</th>
              <th className="th">Box 4*</th>
              <th className="th">Game</th>
            </tr>
          </thead>
          <tbody>
            {(history||[]).map((h, i)=>(
              <tr key={i}>
                <td className="td">{h.date}</td>
                <td className="td">{h.project}</td>
                <td className="td">
                  {Array.isArray(h.zones) ? h.zones.map((z,zi)=>(<div key={zi}>{z}</div>)) : h.zone}
                </td>
                <td className="td"><span className={'pill '+scoreClass(h.score||0)}>{h.score}</span></td>
                <td className="td">{h.b2}</td>
                <td className="td">{h.b2s}</td>
                <td className="td">{h.b4}</td>
                <td className="td">{h.b4s}</td>
                <td className="td">{h.game??'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="row" style={{justifyContent:'flex-end', gap:8, marginTop:10}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=> onSave({ name, photo }) }>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function Recruiters(){
  const [rows, setRows] = useState(load(K.recruiters, [])||[])
  const [view, setView] = useState('Active')
  const [infoIndex, setInfoIndex] = useState(null)

  const setActive = (idx, flag)=>{
    const arr = rows.slice()
    arr[idx] = { ...arr[idx], active: flag }
    setRows(arr); save(K.recruiters, arr); audit('recruiter_status', { name:arr[idx].name, active:flag })
  }
  const filtered = useMemo(()=> view==='Active'? rows.filter(x=>x.active!==false) : rows, [rows,view])

  const openInfo = (idx)=> setInfoIndex(idx)
  const closeInfo = ()=> setInfoIndex(null)
  const saveInfo = (patch)=>{
    const arr = rows.slice()
    const i = infoIndex
    arr[i] = { ...arr[i], ...patch }
    setRows(arr); save(K.recruiters, arr); audit('recruiter_update', { crewcode:arr[i].crewcode, patch })
    closeInfo()
  }

  return (
    <div>
      <div className="row" style={{justifyContent:'flex-end', marginBottom:12}}>
        <button className={'btn '+(view==='Active'?'btn-white':'btn-black')} onClick={()=>setView('Active')}>Active</button>
        <button className={'btn '+(view==='All'?'btn-black':'btn-white')} onClick={()=>setView('All')}>All</button>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Form</th>
              <th className="th">Average</th>
              <th className="th">Box 2 %</th>
              <th className="th">Box 4 %</th>
              <th className="th">Status</th>
              <th className="th">Info</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r,idx)=>{
              const i = rows.indexOf(r)
              const form = (r.form||[]).join(' ')
              const avg = Number(r.avg||0).toFixed(2)
              const b2c = box2ClassByPct(r.box2p||0)
              const b4c = box4ClassByPct(r.box4p||0)
              return (
                <tr key={i}>
                  <td className="td">{r.name}</td>
                  <td className="td"><span className="pill">{form}</span></td>
                  <td className="td"><span className="pill">{avg}</span></td>
                  <td className="td"><span className={'pill '+b2c}>{Math.round(r.box2p||0)}%</span></td>
                  <td className="td"><span className={'pill '+b4c}>{Math.round(r.box4p||0)}%</span></td>
                  <td className="td">
                    {r.active!==false ?
                      <button className="btn btn-white" onClick={()=>setActive(i,false)}>Active</button> :
                      <button className="btn btn-black" onClick={()=>setActive(i,true)}>Inactive</button>}
                  </td>
                  <td className="td"><button className="btn btn-white" onClick={()=>openInfo(i)}>Info</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {infoIndex!==null && <InfoDialog row={rows[infoIndex]} onClose={closeInfo} onSave={saveInfo}/>}
    </div>
  )
}
