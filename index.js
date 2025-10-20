import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState([]);
  const [form, setForm] = useState({ name:'', phone:'', principal:'', annualRate:'', months:'', startDate:'' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    // get session
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadLoans(session.user.id);
    });
    return () => listener?.subscription?.unsubscribe && listener.subscription.unsubscribe();
  }, []);

  async function loadLoans(userId) {
    setLoading(true);
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) setLoans(data || []);
    setLoading(false);
  }

  async function signIn() {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  }

  async function signOut() {
    await supabase.auth.signOut();
    setLoans([]);
    setSession(null);
  }

  const calcInstallment = (P, annualRatePct, nMonths) => {
    const r = Number(annualRatePct) / 100 / 12;
    const Pnum = Number(P);
    const n = Number(nMonths);
    if (!n || n === 0) return 0;
    if (r === 0) return Pnum / n;
    const pow = Math.pow(1 + r, n);
    return (Pnum * r * pow) / (pow - 1);
  };

  async function addLoan(e) {
    e?.preventDefault();
    if (!form.name || !form.principal || !form.months) {
      alert('Preencha nome, valor e parcelas');
      return;
    }
    const userId = session.user.id;
    const { error } = await supabase.from('loans').insert([{
      user_id: userId,
      name: form.name,
      phone: form.phone.replace(/\D/g, ''),
      principal: Number(form.principal),
      annual_rate: Number(form.annualRate) || 0,
      months: Number(form.months),
      start_date: form.startDate || new Date().toISOString().slice(0,10),
    }]);
    if (!error) {
      setForm({ name:'', phone:'', principal:'', annualRate:'', months:'', startDate:'' });
      loadLoans(userId);
    } else {
      alert('Erro ao criar empréstimo');
      console.error(error);
    }
  }

  async function removeLoan(id) {
    if (!confirm('Remover esse empréstimo?')) return;
    await supabase.from('loans').delete().eq('id', id);
    loadLoans(session.user.id);
  }

  async function togglePayment(loanId, installmentIndex) {
    // check existing
    const { data: existing } = await supabase
      .from('payments')
      .select('*')
      .eq('loan_id', loanId)
      .eq('index', installmentIndex)
      .maybeSingle();
    if (existing) {
      await supabase.from('payments').delete().eq('id', existing.id);
    } else {
      await supabase.from('payments').insert([{ loan_id: loanId, index: installmentIndex }]);
    }
    loadLoans(session.user.id);
  }

  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);

  const computeSchedule = (loan) => {
    const parcela = calcInstallment(loan.principal, loan.annual_rate, loan.months);
    const totalPay = parcela * loan.months;
    const schedule = Array.from({ length: loan.months }).map((_, i) => ({
      index: i+1,
      dueDate: addMonths(loan.start_date, i),
      amount: parcela
    }));
    return { parcela, totalPay, schedule };
  };

  const addMonths = (isoDate, monthsToAdd) => {
    const d = new Date(isoDate || new Date().toISOString().slice(0,10));
    const res = new Date(d.getFullYear(), d.getMonth() + monthsToAdd, d.getDate());
    return res.toISOString().slice(0,10);
  };

  const sendWhatsApp = (phone, texto) => {
    const num = phone.replace(/\D/g,'');
    const url = `https://wa.me/55${num}?text=${encodeURIComponent(texto)}`;
    window.open(url,'_blank');
  };

  const sendReminderForLoan = (loan, parcela) => {
    const txt = `Fala ${loan.name}! Sua parcela de ${formatCurrency(parcela)} está pendente. Avisa quando pagar.`;
    sendWhatsApp(loan.phone || '', txt);
  };

  if (!session) {
    return (
      <div style={{padding:40}}>
        <h1>LEK BANK — Login</h1>
        <p>Entre com sua conta Google.</p>
        <button onClick={signIn} style={{padding:'8px 12px',background:'#059669',color:'#fff',border:'none',borderRadius:6}}>Entrar com Google</button>
      </div>
    );
  }

  return (
    <div style={{padding:20,maxWidth:1000,margin:'0 auto'}}>
      <header style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1>LEK BANK</h1>
        <div>
          <span style={{marginRight:12}}>{session.user.email}</span>
          <button onClick={signOut} style={{background:'#ef4444',color:'#fff',border:'none',padding:'6px 10px',borderRadius:6}}>Sair</button>
        </div>
      </header>

      <main style={{marginTop:20}}>
        <section style={{marginBottom:20}}>
          <h2>Novo Empréstimo</h2>
          <form onSubmit={addLoan} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,maxWidth:800}}>
            <input placeholder='Nome' value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <input placeholder='Telefone (somente números)' value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} />
            <input placeholder='Valor (R$)' type='number' value={form.principal} onChange={e=>setForm({...form,principal:e.target.value})} />
            <input placeholder='Juros anual (%)' type='number' value={form.annualRate} onChange={e=>setForm({...form,annualRate:e.target.value})} />
            <input placeholder='Parcelas (meses)' type='number' value={form.months} onChange={e=>setForm({...form,months:e.target.value})} />
            <input placeholder='Data início' type='date' value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} />
            <div style={{gridColumn:'1 / -1'}}>
              <button type='submit' style={{padding:'8px 12px',background:'#10b981',color:'#fff',border:'none',borderRadius:6}}>Adicionar Empréstimo</button>
            </div>
          </form>
        </section>

        <section>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h2>Empréstimos</h2>
            <input placeholder='Buscar por nome ou telefone' value={query} onChange={e=>setQuery(e.target.value)} />
          </div>

          {loading && <div>Carregando...</div>}

          {!loading && loans.length === 0 && <div>Nenhum empréstimo.</div>}

          <div style={{display:'grid',gap:12}}>
            {loans.filter(l => l.name.toLowerCase().includes(query.toLowerCase()) || (l.phone||'').includes(query)).map(loan => {
              const { parcela, totalPay, schedule } = computeSchedule(loan);
              return (
                <div key={loan.id} style={{border:'1px solid #e5e7eb',padding:12,borderRadius:8}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <div>
                      <div style={{fontWeight:700}}>{loan.name} {loan.phone ? `• ${loan.phone}` : ''}</div>
                      <div>Principal: {formatCurrency(loan.principal)} • Juros a.a.: {loan.annual_rate}% • {loan.months}x</div>
                      <div>Parcela: <strong>{formatCurrency(parcela)}</strong> • Total: <strong>{formatCurrency(totalPay)}</strong></div>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <button onClick={()=>sendReminderForLoan(loan, parcela)} style={{padding:'6px 8px',background:'#f59e0b',border:'none',borderRadius:6,color:'#fff'}}>Lembrar via WhatsApp</button>
                      <button onClick={()=>removeLoan(loan.id)} style={{padding:'6px 8px',background:'#ef4444',border:'none',borderRadius:6,color:'#fff'}}>Remover</button>
                    </div>
                  </div>

                  <div style={{marginTop:12,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:8}}>
                    {schedule.map(p => (
                      <div key={p.index} style={{padding:8,borderRadius:6,border:'1px solid #e6e6e6'}}>
                        <div style={{fontSize:12,color:'#6b7280'}}>#{p.index} • Venc: {p.dueDate}</div>
                        <div style={{fontWeight:700}}>{formatCurrency(p.amount)}</div>
                        <button onClick={()=>togglePayment(loan.id,p.index)} style={{marginTop:8,padding:'6px 8px',background:'#10b981',border:'none',borderRadius:6,color:'#fff'}}>Marcar pago</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
