
import React, { useState } from 'react'
import Inflow from './pages/Inflow.jsx'
import Recruiters from './pages/Recruiters.jsx'
import Planning from './pages/Planning.jsx'
import Pay from './pages/Pay.jsx'
import Finances from './pages/Finances.jsx'
import Settings from './pages/Settings.jsx'

const TABS = ['Inflow','Recruiters','Planning','Pay','Finances','Settings']

export default function App(){
  const [tab, setTab] = useState('Inflow')

  return (
    <div>
      <div className="tabs">
        {TABS.map(t=>(
          <button key={t} className={'tab '+(tab===t?'active':'')} onClick={()=>setTab(t)}>{t}</button>
        ))}
        <div className="hdr-actions">
          <button className="btn btn-white">Settings</button>
          <button className="btn btn-white">Logout</button>
        </div>
      </div>
      <div className="container">
        {tab==='Inflow' && <Inflow/>}
        {tab==='Recruiters' && <Recruiters/>}
        {tab==='Planning' && <Planning/>}
        {tab==='Pay' && <Pay/>}
        {tab==='Finances' && <Finances/>}
        {tab==='Settings' && <Settings/>}
      </div>
    </div>
  )
}
