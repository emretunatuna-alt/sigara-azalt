import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Modal, StyleSheet, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform, AppState
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const DAYS = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'];
const MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

const BILDIRIM_MESAJLARI = [
  { title: "Hedefin neresindesin? 🎯", body: "Bugün henüz giriş yapmadın. Bir dakikan var mı?" },
  { title: "Sessizsin bugün 🌿", body: "Takip etmek değişimin ilk adımı." },
  { title: "Dün çok iyiydin.", body: "Bugün daha da iyi olabilirsin 🌿" },
  { title: "Hedefini sen koydun.", body: "Bugün nasıl gidiyor?" },
  { title: "Küçük adımlar büyük değişim yaratır.", body: "Bugününü kaydet." },
  { title: "En iyi günün hâlâ seni bekliyor.", body: "Bugün o gün olabilir." },
  { title: "Her gün biraz daha güçlüsün.", body: "Kendine inan 💪" },
  { title: "Bir giriş yapmak 5 saniye.", body: "Bugünü kaydetmek ister misin?" },
  { title: "Kendinle gurur duyacağın bir gün yap.", body: "Hadi, başla!" },
  { title: "Sessizlik bazen en güçlü cevaptır.", body: "Ama bugün nasıl gittiğini merak ettik 🌿" },
  { title: "Bugünkü hedefin ne kadar uzakta?", body: "Bir bak, belki sürpriz yapıyorsun." },
  { title: "Dünün rekoru hâlâ duruyorken...", body: "Bugün kırabilirsin 🎯" },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function getToday() { return new Date().toISOString().split('T')[0]; }
function getLastNDays(n) {
  const days = [];
  for (let i=n-1;i>=0;i--) { const d=new Date(); d.setDate(d.getDate()-i); days.push(d.toISOString().split('T')[0]); }
  return days;
}
function dateLabel(dateStr) {
  const d = new Date(dateStr);
  const today = getToday();
  const yesterday = (() => { const x=new Date(); x.setDate(x.getDate()-1); return x.toISOString().split('T')[0]; })();
  if (dateStr === today) return 'Bugün';
  if (dateStr === yesterday) return 'Dün';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function getPrevDate(dateStr) {
  const d = new Date(dateStr); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0];
}
function sigaraUpToHour(sigaraLog, hour) {
  return (sigaraLog||[]).filter(s => {
    const [h] = s.time.split(':').map(Number);
    return h <= hour;
  }).length;
}

async function load(key, fallback) {
  try { const v = await AsyncStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
async function save(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.error(e); }
}

function BarChart({ data, color, maxVal }) {
  const max = maxVal || Math.max(...data.map(d=>d.val), 1);
  return (
    <View style={{ flexDirection:'row', alignItems:'flex-end', height:110, gap:4, paddingHorizontal:4, paddingTop:16 }}>
      {data.map((d,i) => (
        <View key={i} style={{ flex:1, alignItems:'center', justifyContent:'flex-end' }}>
          <Text style={{ fontSize:9, color:'#1b4332', fontWeight:'500', marginBottom:2 }}>{d.val>0?d.val:''}</Text>
          <View style={{ width:'100%', backgroundColor:d.val>0?color:'#e8f5e2', borderRadius:3, height:Math.max((d.val/max)*72, d.val>0?4:2) }}/>
          <Text style={{ fontSize:9, color:'#74c69d', marginTop:4, textAlign:'center' }}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function App() {
  const [tab, setTab] = useState('daily');
  const [data, setData] = useState({});
  const [goals, setGoals] = useState({ daily:20, weekly:100 });
  const [loaded, setLoaded] = useState(false);
  const [entryModal, setEntryModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const [entryForm, setEntryForm] = useState({ km:'', kalp:'' });
  const [goalInput, setGoalInput] = useState({ daily:'20', weekly:'100' });
  const [editIdx, setEditIdx] = useState(null);
  const [editTimeH, setEditTimeH] = useState('');
  const [editTimeM, setEditTimeM] = useState('');
  const [statsRange, setStatsRange] = useState(7);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [notifEnabled, setNotifEnabled] = useState(false);
  const appState = useRef(AppState.currentState);

  const today = getToday();
  const prevDate = getPrevDate(selectedDate);
  const selectedData = data[selectedDate] || { sigara:0, km:0, kalp:null, entries:[], kalpLog:[], sigaraLog:[] };
  const prevData = data[prevDate] || { sigara:0, km:0, kalp:null, entries:[], kalpLog:[], sigaraLog:[] };

  useEffect(() => {
    (async () => {
      const d = await load('sigara_data', {});
      const g = await load('sigara_goals', { daily:20, weekly:100 });
      const n = await load('notif_enabled', false);
      setData(d); setGoals(g); setGoalInput({ daily:String(g.daily), weekly:String(g.weekly) });
      setNotifEnabled(n); setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) save('sigara_data', data); }, [data, loaded]);
  useEffect(() => { if (loaded) save('sigara_goals', goals); }, [goals, loaded]);
  useEffect(() => { if (loaded) save('notif_enabled', notifEnabled); }, [notifEnabled, loaded]);

  // Bildirim izni ve zamanlama
  const enableNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('Bildirim izni verilmedi. Ayarlardan açabilirsin.');
      return;
    }
    setNotifEnabled(true);
  };

  const disableNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setNotifEnabled(false);
  };

  // Her uygulama açıldığında veya veri değiştiğinde bildirimi kontrol et
  useEffect(() => {
    if (!loaded || !notifEnabled) return;
    checkAndScheduleNotification();
  }, [loaded, notifEnabled, data, checkAndScheduleNotification]);

  const checkAndScheduleNotification = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Şart 1: Hedef belirlenmiş mi?
    if (!goals.daily || goals.daily === 0) return;

    // Şart 2: Bugün en az 1 giriş yapılmış mı?
    const todayLog = data[today]?.sigaraLog || [];
    if (todayLog.length === 0) return;

    // Şart 3: Son girişten 6 saat geçmiş mi?
    const lastEntry = todayLog[todayLog.length - 1];
    const now = Date.now();
    const altıSaat = 6 * 60 * 60 * 1000;
    if (now - lastEntry.ts < altıSaat) return;

    // Şartlar sağlandı — bildirim gönder
    const mesaj = BILDIRIM_MESAJLARI[Math.floor(Math.random() * BILDIRIM_MESAJLARI.length)];
    await Notifications.scheduleNotificationAsync({
      content: { title: mesaj.title, body: mesaj.body },
      trigger: { seconds: 1 },
    });
  };

  const addOne = () => {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0,5);
    setData(prev => {
      const d = prev[today] || { sigara:0, km:0, kalp:null, entries:[], kalpLog:[], sigaraLog:[] };
      return { ...prev, [today]: { ...d, sigara:d.sigara+1, sigaraLog:[...(d.sigaraLog||[]), { time:timeStr, ts:now.getTime() }] }};
    });
    if (selectedDate !== today) setSelectedDate(today);
  };

  const removeOne = () => {
    setData(prev => {
      const d = prev[today] || { sigara:0, km:0, kalp:null, entries:[], kalpLog:[], sigaraLog:[] };
      if (d.sigara === 0) return prev;
      return { ...prev, [today]: { ...d, sigara:d.sigara-1, sigaraLog:(d.sigaraLog||[]).slice(0,-1) }};
    });
    if (selectedDate !== today) setSelectedDate(today);
  };

  const openEditModal = (i, item) => {
    setEditIdx(i); const [h,m] = item.time.split(':');
    setEditTimeH(h); setEditTimeM(m); setEditModal(true);
  };

  const saveLogEdit = () => {
    const h = editTimeH.padStart(2,'0'); const m = editTimeM.padStart(2,'0');
    const newTime = `${h}:${m}`;
    setData(prev => {
      const d = prev[today] || { sigara:0, km:0, kalp:null, entries:[], kalpLog:[], sigaraLog:[] };
      const log = [...(d.sigaraLog||[])];
      const nd = new Date(); nd.setHours(Number(h),Number(m),0,0);
      log[editIdx] = { time:newTime, ts:nd.getTime() };
      log.sort((a,b) => a.ts-b.ts);
      return { ...prev, [today]: { ...d, sigaraLog:log }};
    });
    setEditModal(false); setEditIdx(null);
  };

  const saveEntry = () => {
    setData(prev => {
      const d = prev[today] || { sigara:0, km:0, kalp:null, entries:[], kalpLog:[], sigaraLog:[] };
      const kalpLog = entryForm.kalp ? [...(d.kalpLog||[]), Number(entryForm.kalp)] : (d.kalpLog||[]);
      const kalpAvg = kalpLog.length>0 ? Math.round(kalpLog.reduce((a,b)=>a+b,0)/kalpLog.length) : null;
      return { ...prev, [today]: { ...d, km:entryForm.km?Number(entryForm.km):d.km, kalp:kalpAvg, kalpLog, entries:[...(d.entries||[]), entryForm] }};
    });
    setEntryForm({ km:'', kalp:'' }); setEntryModal(false);
  };

  const saveGoals = () => {
    setGoals({ daily:Number(goalInput.daily), weekly:Number(goalInput.weekly) });
    setGoalModal(false);
  };

  const sigaraLog = selectedData.sigaraLog || [];
  const intervals = sigaraLog.slice(1).map((s,i) => Math.round((s.ts-sigaraLog[i].ts)/60000));
  const avgInterval = intervals.length>0 ? Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length) : null;

  const nowHour = new Date().getHours();
  const todaySoFar = selectedDate === today ? sigaraUpToHour(selectedData.sigaraLog, nowHour) : selectedData.sigara;
  const prevSoFar = selectedDate === today ? sigaraUpToHour(prevData.sigaraLog, nowHour) : prevData.sigara;
  const compDiff = todaySoFar - prevSoFar;
  const compText = compDiff < 0
    ? `🎉 Saat ${String(nowHour).padStart(2,'0')}:00'a kadar ${Math.abs(compDiff)} az — harika gidiyorsun!`
    : compDiff > 0
    ? `💪 Saat ${String(nowHour).padStart(2,'0')}:00'a kadar ${compDiff} fazla — yavaşla biraz!`
    : `👍 Dünle aynı tempoda gidiyorsun.`;

  const statsDays = getLastNDays(statsRange);
  const statsTotalSigara = statsDays.reduce((s,d)=>s+(data[d]?.sigara||0),0);
  const statsTotalKm = statsDays.reduce((s,d)=>s+(data[d]?.km||0),0);
  const statsAvgDaily = (statsTotalSigara/statsDays.length).toFixed(1);
  const statsMax = statsDays.reduce((mx,d)=>Math.max(mx,data[d]?.sigara||0),0);
  const statsMinArr = statsDays.filter(d=>(data[d]?.sigara||0)>0);
  const statsMin = statsMinArr.length>0 ? statsMinArr.reduce((mn,d)=>Math.min(mn,data[d]?.sigara||999),999) : '—';

  const todayKalpLog = selectedData.kalpLog || [];
  const todayKalpAvg = todayKalpLog.length>0 ? Math.round(todayKalpLog.reduce((a,b)=>a+b,0)/todayKalpLog.length) : null;
  const yestKalpLog = prevData.kalpLog || [];
  const yestKalpAvg = yestKalpLog.length>0 ? Math.round(yestKalpLog.reduce((a,b)=>a+b,0)/yestKalpLog.length) : null;
  const kalpDiff = todayKalpAvg && yestKalpAvg ? todayKalpAvg-yestKalpAvg : null;
  const kalpTrendText = kalpDiff===null ? null
    : kalpDiff<-3 ? `💚 Dünden ${Math.abs(kalpDiff)} bpm daha düşük — kalbin rahatlamış.`
    : kalpDiff>3 ? `🔴 Dünden ${kalpDiff} bpm daha yüksek — stres veya yorgunluk olabilir.`
    : `🟡 Dünle neredeyse aynı (${kalpDiff>0?'+':''}${kalpDiff} bpm) — stabil.`;

  const dailyPct = Math.min(100, (selectedData.sigara/(goals.daily||1))*100);
  const pctColor = (p) => p<60?'#2d6a4f':p<85?'#b5851a':'#c0392b';

  const sigaraBarData = statsDays.map(date => ({ val:data[date]?.sigara||0, label:DAYS[new Date(date).getDay()].slice(0,1) }));
  const kmBarData = statsDays.map(date => ({ val:data[date]?.km||0, label:DAYS[new Date(date).getDay()].slice(0,1) }));
  const aralıkBarData = statsDays.map(date => {
    const log = data[date]?.sigaraLog||[];
    const ints = log.slice(1).map((s,i)=>Math.round((s.ts-log[i].ts)/60000));
    return { val:ints.length>0?Math.round(ints.reduce((a,b)=>a+b,0)/ints.length):0, label:DAYS[new Date(date).getDay()].slice(0,1) };
  });
  const kalpBarData = statsDays.map(date => {
    const kl = data[date]?.kalpLog||[];
    return { val:kl.length>0?Math.round(kl.reduce((a,b)=>a+b,0)/kl.length):0, label:DAYS[new Date(date).getDay()].slice(0,1) };
  });

  const last14 = getLastNDays(14);

  if (!loaded) return (
    <SafeAreaView style={s.loadingContainer}>
      <Text style={s.loadingEmoji}>🌿</Text>
      <Text style={s.loadingText}>Veriler yükleniyor...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f7ee"/>

      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>🌿 Sigara Azalt</Text>
          <Text style={s.headerDate}>{new Date().toLocaleDateString('tr-TR',{ weekday:'long', day:'numeric', month:'long' })}</Text>
        </View>
        <TouchableOpacity style={s.goalBtn} onPress={()=>setGoalModal(true)}>
          <Text style={s.goalBtnText}>🎯 Hedef</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        {[['daily','Bugün'],['stats','📊 İstatistik']].map(([t,lbl])=>(
          <TouchableOpacity key={t} style={[s.tab, tab===t&&s.tabActive]} onPress={()=>setTab(t)}>
            <Text style={[s.tabText, tab===t&&s.tabTextActive]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {tab==='daily' && (
          <View>
            <TouchableOpacity style={s.datePicker} onPress={()=>setDateModal(true)}>
              <Text style={s.datePickerText}>📅 {dateLabel(selectedDate)}</Text>
              <Text style={s.datePickerArrow}>▾</Text>
            </TouchableOpacity>

            {selectedDate === today && prevData.sigara > 0 && (
              <View style={[s.compCard, { borderColor:compDiff<0?'#b7e4c7':compDiff>0?'#f5b8c8':'#b7e4c7' }]}>
                <Text style={s.compText}>{compText}</Text>
                <Text style={s.compSub}>Dün aynı saatte: {prevSoFar} · Bugün: {todaySoFar}</Text>
              </View>
            )}

            <View style={s.counterCard}>
              <Text style={s.counterLabel}>{selectedDate===today?'BUGÜN İÇİLEN':dateLabel(selectedDate).toUpperCase()}</Text>
              <Text style={s.counterNum}>{selectedData.sigara}</Text>
              <Text style={s.counterSub}>sigara</Text>
              {selectedDate===today && (
                <View style={s.counterBtns}>
                  <TouchableOpacity style={s.minusBtn} onPress={removeOne}><Text style={s.minusBtnText}>−</Text></TouchableOpacity>
                  <TouchableOpacity style={s.plusBtn} onPress={addOne}><Text style={s.plusBtnText}>+ 1 Sigara</Text></TouchableOpacity>
                </View>
              )}
              {goals.daily>0 && (
                <View style={s.progressWrap}>
                  <View style={s.progressTrack}><View style={[s.progressBar,{width:`${dailyPct}%`,backgroundColor:pctColor(dailyPct)}]}/></View>
                  <Text style={[s.progressLabel,{color:pctColor(dailyPct)}]}>{selectedData.sigara} / {goals.daily} günlük hedef</Text>
                </View>
              )}
            </View>

            {intervals.length>0 && (
              <View style={s.avgCard}>
                <View style={s.avgItem}><Text style={s.avgIcon}>⏱️</Text><Text style={s.avgVal}>{avgInterval} dk</Text><Text style={s.avgLbl}>Ort. aralık</Text></View>
                <View style={s.avgDivider}/>
                <View style={s.avgItem}><Text style={s.avgIcon}>🔥</Text><Text style={[s.avgVal,{color:Math.min(...intervals)<30?'#c0392b':'#1b4332'}]}>{Math.min(...intervals)} dk</Text><Text style={s.avgLbl}>En kısa</Text></View>
                <View style={s.avgDivider}/>
                <View style={s.avgItem}><Text style={s.avgIcon}>🌿</Text><Text style={[s.avgVal,{color:'#2d6a4f'}]}>{Math.max(...intervals)} dk</Text><Text style={s.avgLbl}>En uzun</Text></View>
              </View>
            )}

            {sigaraLog.length>0 && (
              <View style={s.logCard}>
                <View style={s.logHeader}>
                  <Text style={s.logTitle}>🕐 SAATLERİ</Text>
                  {avgInterval && <Text style={s.logAvgBadge}>ort. {avgInterval} dk'da bir</Text>}
                </View>
                {sigaraLog.map((item,i) => {
                  const gap = i>0?Math.round((item.ts-sigaraLog[i-1].ts)/60000):null;
                  const gapColor = gap!==null?(gap<30?'#c0392b':gap<60?'#b5851a':'#2d6a4f'):'#74c69d';
                  return (
                    <View key={i} style={s.logRow}>
                      <Text style={s.logNum}>{i+1}</Text>
                      <Text style={s.logTime}>{item.time}</Text>
                      {gap!==null?<Text style={[s.logGap,{color:gapColor}]}>+{gap} dk</Text>:<Text style={s.logGapEmpty}>ilk</Text>}
                      {selectedDate===today && (
                        <TouchableOpacity style={s.logEditBtn} onPress={()=>openEditModal(i,item)}>
                          <Text style={s.logEditBtnText}>✎</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <View style={s.statsRow}>
              <View style={s.statCard}><Text style={s.statIcon}>🏃</Text><Text style={s.statVal}>{selectedData.km||0} km</Text><Text style={s.statLbl}>Koşu</Text></View>
              <View style={s.statCard}><Text style={s.statIcon}>💓</Text><Text style={s.statVal}>{todayKalpAvg||'—'}</Text><Text style={s.statLbl}>Kalp ort.</Text></View>
              <View style={s.statCard}><Text style={s.statIcon}>📝</Text><Text style={s.statVal}>{(selectedData.entries||[]).length}</Text><Text style={s.statLbl}>Giriş</Text></View>
            </View>

            {selectedDate===today && (
              <TouchableOpacity style={s.entryBtn} onPress={()=>setEntryModal(true)}>
                <Text style={s.entryBtnText}>🌿 Veri Girişi Yap</Text>
              </TouchableOpacity>
            )}

            {/* Bildirim Kartı */}
            <View style={s.notifCard}>
              <View style={s.notifRow}>
                <View>
                  <Text style={s.notifTitle}>🔔 Hatırlatıcı</Text>
                  <Text style={s.notifSub}>{notifEnabled ? 'Günde 2 kez hatırlatma açık' : 'Giriş yapmadığında hatırlatalım mı?'}</Text>
                </View>
                <TouchableOpacity
                  style={[s.notifToggle, { backgroundColor:notifEnabled?'#2d6a4f':'#e8f5e2' }]}
                  onPress={notifEnabled ? disableNotifications : enableNotifications}
                >
                  <Text style={[s.notifToggleText, { color:notifEnabled?'#fff':'#2d6a4f' }]}>
                    {notifEnabled ? 'Açık' : 'Aç'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {tab==='stats' && (
          <View>
            <View style={s.rangeToggle}>
              {[7,30].map(n=>(
                <TouchableOpacity key={n} style={[s.rangeBtn,statsRange===n&&s.rangeBtnActive]} onPress={()=>setStatsRange(n)}>
                  <Text style={[s.rangeBtnText,statsRange===n&&s.rangeBtnTextActive]}>{n} Gün</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.summaryGrid}>
              {[
                { icon:'🚬', val:statsTotalSigara, lbl:'Toplam' },
                { icon:'📊', val:statsAvgDaily, lbl:'Günlük ort.' },
                { icon:'📈', val:statsMax, lbl:'En fazla', color:'#c0392b' },
                { icon:'🌿', val:statsMin, lbl:'En az', color:'#2d6a4f' },
                { icon:'🏃', val:`${statsTotalKm.toFixed(1)}`, lbl:'Toplam km' },
                { icon:'🎯', val:goals.daily, lbl:'Hedef' },
              ].map((item,i)=>(
                <View key={i} style={s.summaryCard}>
                  <Text style={s.summaryIcon}>{item.icon}</Text>
                  <Text style={[s.summaryVal,item.color&&{color:item.color}]}>{item.val}</Text>
                  <Text style={s.summaryLbl}>{item.lbl}</Text>
                </View>
              ))}
            </View>

            <View style={s.chartCard}>
              <Text style={s.chartTitle}>🚬 Günlük</Text>
              <BarChart data={sigaraBarData} color="#52b788" maxVal={goals.daily}/>
            </View>

            <View style={s.chartCard}>
              <Text style={s.chartTitle}>🏃 Koşu (km)</Text>
              <BarChart data={kmBarData} color="#2d6a4f"/>
            </View>

            <View style={s.chartCard}>
              <Text style={s.chartTitle}>⏱️ Ortalama Aralık (dk)</Text>
              <BarChart data={aralıkBarData} color="#b5851a"/>
            </View>

            {kalpBarData.some(d=>d.val>0) && (
              <View style={s.chartCard}>
                <Text style={s.chartTitle}>💓 Kalp Atışı (bpm)</Text>
                {todayKalpAvg && <Text style={s.kalpAvgLine}>Bugün ort. {todayKalpAvg} bpm{todayKalpLog.length>1?` · ${todayKalpLog.length} ölçüm`:''}</Text>}
                <BarChart data={kalpBarData} color="#e05c7a"/>
                {kalpTrendText && <Text style={s.kalpTrend}>{kalpTrendText}</Text>}
              </View>
            )}

            <View style={s.breakdownBox}>
              <Text style={s.breakdownTitle}>GÜNLÜK DETAY ({statsRange} GÜN)</Text>
              {statsDays.slice().reverse().map(date => {
                const d = data[date]||{}; const dayObj = new Date(date); const isToday = date===today;
                const log = d.sigaraLog||[];
                const ints = log.slice(1).map((s,i)=>Math.round((s.ts-log[i].ts)/60000));
                const avg = ints.length>0?Math.round(ints.reduce((a,b)=>a+b,0)/ints.length):null;
                return (
                  <TouchableOpacity key={date} style={[s.breakdownRow,isToday&&s.breakdownToday]} onPress={()=>{ setSelectedDate(date); setTab('daily'); }}>
                    <Text style={s.breakdownDay}>{isToday?'Bugün':DAYS[dayObj.getDay()]} <Text style={s.breakdownDate}>{dayObj.getDate()}/{dayObj.getMonth()+1}</Text></Text>
                    <View style={s.breakdownStats}>
                      <Text style={s.bStat}>🚬 {d.sigara||0}</Text>
                      {d.km>0&&<Text style={s.bStat}>🏃 {d.km}km</Text>}
                      {avg&&<Text style={s.bStat}>⏱️ {avg}dk</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        <View style={{ height:40 }}/>
      </ScrollView>

      {/* Tarih Modal */}
      <Modal visible={dateModal} transparent animationType="slide" onRequestClose={()=>setDateModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setDateModal(false)}>
          <TouchableOpacity style={s.modal} activeOpacity={1}>
            <Text style={s.modalTitle}>📅 Tarih Seç</Text>
            <Text style={s.modalSub}>Son 14 gün</Text>
            <ScrollView style={{ maxHeight:300 }}>
              {last14.slice().reverse().map(date => {
                const d = data[date]||{}; const isSelected = date===selectedDate;
                return (
                  <TouchableOpacity key={date} style={[s.dateRow,isSelected&&s.dateRowSelected]} onPress={()=>{ setSelectedDate(date); setDateModal(false); }}>
                    <Text style={[s.dateRowText,isSelected&&s.dateRowTextSelected]}>{dateLabel(date)}{date===today?' (bugün)':''}</Text>
                    <Text style={[s.dateRowCount,isSelected&&{color:'#fff'}]}>🚬 {d.sigara||0}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Veri Girişi Modal */}
      <Modal visible={entryModal} transparent animationType="slide" onRequestClose={()=>setEntryModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setEntryModal(false)}>
            <TouchableOpacity style={s.modal} activeOpacity={1}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={s.modalTitle}>🌿 Veri Girişi</Text>
                <Text style={s.modalSub}>Koşu ve kalp atışını gir</Text>
                <Text style={s.fieldLabel}>🏃 Koşu (km)</Text>
                <TextInput style={s.fieldInput} placeholder="ör: 3.2" keyboardType="decimal-pad" returnKeyType="next" value={entryForm.km} onChangeText={v=>setEntryForm(f=>({...f,km:v}))}/>
                <Text style={s.fieldLabel}>💓 Kalp atışı (opsiyonel)</Text>
                <TextInput style={s.fieldInput} placeholder="ör: 72" keyboardType="number-pad" returnKeyType="done" value={entryForm.kalp} onChangeText={v=>setEntryForm(f=>({...f,kalp:v}))} onSubmitEditing={saveEntry}/>
                <TouchableOpacity style={s.saveBtn} onPress={saveEntry}><Text style={s.saveBtnText}>Kaydet</Text></TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={()=>setEntryModal(false)}><Text style={s.cancelBtnText}>İptal</Text></TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Saat Düzenleme Modal */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={()=>setEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setEditModal(false)}>
            <TouchableOpacity style={s.modal} activeOpacity={1}>
              <Text style={s.modalTitle}>🕐 Saati Düzenle</Text>
              <Text style={s.modalSub}>{editIdx!==null?`${editIdx+1}. girişin saatini düzelt`:''}</Text>
              <View style={s.timeEditRow}>
                <View style={s.timeEditGroup}>
                  <Text style={s.timeEditLabel}>Saat</Text>
                  <TextInput style={s.timeEditInput} keyboardType="number-pad" maxLength={2} placeholder="08" value={editTimeH} onChangeText={v=>setEditTimeH(v.replace(/[^0-9]/g,''))}/>
                </View>
                <Text style={s.timeEditColon}>:</Text>
                <View style={s.timeEditGroup}>
                  <Text style={s.timeEditLabel}>Dakika</Text>
                  <TextInput style={s.timeEditInput} keyboardType="number-pad" maxLength={2} placeholder="45" value={editTimeM} onChangeText={v=>setEditTimeM(v.replace(/[^0-9]/g,''))}/>
                </View>
              </View>
              <TouchableOpacity style={s.saveBtn} onPress={saveLogEdit}><Text style={s.saveBtnText}>Kaydet</Text></TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={()=>setEditModal(false)}><Text style={s.cancelBtnText}>İptal</Text></TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Hedef Modal */}
      <Modal visible={goalModal} transparent animationType="slide" onRequestClose={()=>setGoalModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ flex:1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setGoalModal(false)}>
            <TouchableOpacity style={s.modal} activeOpacity={1}>
              <Text style={s.modalTitle}>🎯 Hedefler</Text>
              <Text style={s.fieldLabel}>Günlük maks.</Text>
              <TextInput style={s.fieldInput} keyboardType="number-pad" returnKeyType="next" value={goalInput.daily} onChangeText={v=>setGoalInput(g=>({...g,daily:v}))}/>
              <Text style={s.fieldLabel}>Haftalık maks.</Text>
              <TextInput style={s.fieldInput} keyboardType="number-pad" returnKeyType="done" value={goalInput.weekly} onChangeText={v=>setGoalInput(g=>({...g,weekly:v}))} onSubmitEditing={saveGoals}/>
              <TouchableOpacity style={s.saveBtn} onPress={saveGoals}><Text style={s.saveBtnText}>Kaydet</Text></TouchableOpacity>
              <TouchableOpacity style={s.cancelBtn} onPress={()=>setGoalModal(false)}><Text style={s.cancelBtnText}>İptal</Text></TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex:1, backgroundColor:'#f0f7ee' },
  loadingContainer: { flex:1, backgroundColor:'#f0f7ee', alignItems:'center', justifyContent:'center' },
  loadingEmoji: { fontSize:48, marginBottom:12 },
  loadingText: { fontSize:15, color:'#52796f' },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:18, paddingTop:12, paddingBottom:8 },
  headerTitle: { fontSize:24, fontWeight:'700', color:'#1b4332' },
  headerDate: { fontSize:12, color:'#52796f', marginTop:2 },
  goalBtn: { backgroundColor:'#d8f3dc', borderWidth:1, borderColor:'#b7e4c7', borderRadius:20, paddingHorizontal:14, paddingVertical:8 },
  goalBtnText: { fontSize:13, color:'#2d6a4f', fontWeight:'600' },
  tabs: { flexDirection:'row', backgroundColor:'#e8f5e2', marginHorizontal:18, borderRadius:12, padding:4, marginBottom:12 },
  tab: { flex:1, paddingVertical:10, alignItems:'center', borderRadius:10 },
  tabActive: { backgroundColor:'#fff', shadowColor:'#2d6a4f', shadowOpacity:0.12, shadowRadius:4, elevation:2 },
  tabText: { fontSize:13, fontWeight:'600', color:'#52796f' },
  tabTextActive: { color:'#1b4332' },
  scroll: { flex:1, paddingHorizontal:18 },
  datePicker: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:'#fff', borderWidth:1, borderColor:'#b7e4c7', borderRadius:12, paddingHorizontal:16, paddingVertical:12, marginBottom:12 },
  datePickerText: { fontSize:15, fontWeight:'600', color:'#1b4332' },
  datePickerArrow: { fontSize:12, color:'#74c69d' },
  compCard: { borderWidth:1.5, borderRadius:14, padding:14, marginBottom:12, backgroundColor:'#fff' },
  compText: { fontSize:14, fontWeight:'600', color:'#1b4332', marginBottom:4 },
  compSub: { fontSize:12, color:'#74c69d' },
  counterCard: { backgroundColor:'#f7faf4', borderWidth:1, borderColor:'#b7e4c7', borderRadius:20, padding:24, marginBottom:14, alignItems:'center' },
  counterLabel: { fontSize:10, letterSpacing:2, color:'#74c69d', marginBottom:8 },
  counterNum: { fontSize:80, fontWeight:'700', color:'#1b4332', lineHeight:88 },
  counterSub: { fontSize:14, color:'#74c69d', marginBottom:20 },
  counterBtns: { flexDirection:'row', gap:12, marginBottom:16 },
  plusBtn: { backgroundColor:'#2d6a4f', borderRadius:14, paddingHorizontal:28, paddingVertical:14 },
  plusBtnText: { color:'#fff', fontSize:16, fontWeight:'700' },
  minusBtn: { backgroundColor:'#e8f5e2', borderWidth:1, borderColor:'#b7e4c7', borderRadius:14, paddingHorizontal:18, paddingVertical:14 },
  minusBtnText: { color:'#52796f', fontSize:20 },
  progressWrap: { width:'100%', marginTop:4 },
  progressTrack: { height:8, backgroundColor:'#e8f5e2', borderRadius:8, overflow:'hidden', marginBottom:6 },
  progressBar: { height:8, borderRadius:8 },
  progressLabel: { fontSize:12, fontWeight:'600', textAlign:'center' },
  avgCard: { flexDirection:'row', backgroundColor:'#fff', borderWidth:1, borderColor:'#d8f3dc', borderRadius:16, marginBottom:14, overflow:'hidden' },
  avgItem: { flex:1, alignItems:'center', padding:14 },
  avgIcon: { fontSize:18, marginBottom:4 },
  avgVal: { fontSize:18, fontWeight:'800', color:'#1b4332' },
  avgLbl: { fontSize:10, color:'#74c69d', marginTop:3 },
  avgDivider: { width:1, backgroundColor:'#e8f5e2', marginVertical:10 },
  logCard: { backgroundColor:'#fff', borderWidth:1, borderColor:'#d8f3dc', borderRadius:14, padding:14, marginBottom:14 },
  logHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10 },
  logTitle: { fontSize:10, letterSpacing:1.5, color:'#74c69d', fontWeight:'700' },
  logAvgBadge: { fontSize:12, fontWeight:'700', color:'#2d6a4f', backgroundColor:'#e8f5e2', borderRadius:20, paddingHorizontal:10, paddingVertical:3 },
  logRow: { flexDirection:'row', alignItems:'center', paddingVertical:6, paddingHorizontal:8, borderRadius:8, backgroundColor:'#f7faf4', marginBottom:4 },
  logNum: { fontSize:11, color:'#b7e4c7', fontWeight:'700', width:18, textAlign:'right', marginRight:10 },
  logTime: { fontSize:14, fontWeight:'700', color:'#1b4332', width:44 },
  logGap: { fontSize:12, fontWeight:'600', flex:1, backgroundColor:'#f0f7ee', borderRadius:8, paddingHorizontal:8, paddingVertical:2, textAlign:'center' },
  logGapEmpty: { fontSize:11, color:'#b7e4c7', flex:1, fontStyle:'italic', textAlign:'center' },
  logEditBtn: { backgroundColor:'#e8f5e2', borderWidth:1, borderColor:'#b7e4c7', borderRadius:8, paddingHorizontal:10, paddingVertical:4, marginLeft:8 },
  logEditBtnText: { color:'#2d6a4f', fontSize:14, fontWeight:'700' },
  statsRow: { flexDirection:'row', gap:10, marginBottom:14 },
  statCard: { flex:1, backgroundColor:'#fff', borderWidth:1, borderColor:'#d8f3dc', borderRadius:14, padding:14, alignItems:'center' },
  statIcon: { fontSize:20, marginBottom:4 },
  statVal: { fontSize:18, fontWeight:'700', color:'#1b4332' },
  statLbl: { fontSize:11, color:'#74c69d', marginTop:2 },
  entryBtn: { width:'100%', backgroundColor:'#fff', borderWidth:2, borderColor:'#b7e4c7', borderStyle:'dashed', borderRadius:14, padding:14, alignItems:'center', marginBottom:14 },
  entryBtnText: { color:'#2d6a4f', fontSize:15, fontWeight:'600' },
  notifCard: { backgroundColor:'#fff', borderWidth:1, borderColor:'#d8f3dc', borderRadius:14, padding:16, marginBottom:14 },
  notifRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  notifTitle: { fontSize:14, fontWeight:'700', color:'#1b4332', marginBottom:4 },
  notifSub: { fontSize:12, color:'#74c69d', maxWidth:220 },
  notifToggle: { borderRadius:20, paddingHorizontal:16, paddingVertical:8 },
  notifToggleText: { fontSize:13, fontWeight:'700' },
  chartCard: { backgroundColor:'#fff', borderWidth:1, borderColor:'#d8f3dc', borderRadius:16, padding:16, marginBottom:14 },
  chartTitle: { fontSize:13, fontWeight:'700', color:'#2d6a4f', marginBottom:4 },
  kalpAvgLine: { fontSize:13, fontWeight:'700', color:'#c0394e', marginBottom:6 },
  kalpTrend: { fontSize:13, color:'#52796f', lineHeight:20, backgroundColor:'#f7faf4', borderRadius:10, padding:10, marginTop:8 },
  breakdownBox: { backgroundColor:'#fff', borderWidth:1, borderColor:'#d8f3dc', borderRadius:16, padding:16, marginBottom:14 },
  breakdownTitle: { fontSize:10, letterSpacing:1.5, color:'#74c69d', marginBottom:10 },
  breakdownRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:9, borderBottomWidth:1, borderBottomColor:'#f0f7ee' },
  breakdownToday: { backgroundColor:'#f0f7ee', borderRadius:8, paddingHorizontal:8, marginHorizontal:-8 },
  breakdownDay: { fontSize:14, fontWeight:'600', color:'#1b4332' },
  breakdownDate: { fontWeight:'400', color:'#74c69d' },
  breakdownStats: { flexDirection:'row', gap:10 },
  bStat: { fontSize:13, color:'#52796f' },
  rangeToggle: { flexDirection:'row', backgroundColor:'#e8f5e2', borderRadius:12, padding:4, marginBottom:16, alignSelf:'flex-start', gap:4 },
  rangeBtn: { borderRadius:9, paddingHorizontal:20, paddingVertical:8 },
  rangeBtnActive: { backgroundColor:'#fff' },
  rangeBtnText: { fontSize:13, fontWeight:'600', color:'#52796f' },
  rangeBtnTextActive: { color:'#1b4332' },
  summaryGrid: { flexDirection:'row', flexWrap:'wrap', gap:10, marginBottom:16 },
  summaryCard: { width:'30%', backgroundColor:'#fff', borderWidth:1, borderColor:'#d8f3dc', borderRadius:14, padding:12, alignItems:'center' },
  summaryIcon: { fontSize:18, marginBottom:4 },
  summaryVal: { fontSize:18, fontWeight:'800', color:'#1b4332' },
  summaryLbl: { fontSize:9, color:'#74c69d', marginTop:3, textAlign:'center' },
  dateRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12, paddingHorizontal:16, borderRadius:10, marginBottom:4 },
  dateRowSelected: { backgroundColor:'#2d6a4f' },
  dateRowText: { fontSize:15, fontWeight:'600', color:'#1b4332' },
  dateRowTextSelected: { color:'#fff' },
  dateRowCount: { fontSize:13, color:'#74c69d' },
  modalOverlay: { flex:1, backgroundColor:'rgba(27,67,50,0.3)', justifyContent:'flex-end' },
  modal: { backgroundColor:'#fff', borderTopLeftRadius:24, borderTopRightRadius:24, padding:28, paddingBottom:40 },
  modalTitle: { fontSize:20, fontWeight:'700', color:'#1b4332', marginBottom:4 },
  modalSub: { fontSize:13, color:'#74c69d', marginBottom:22 },
  fieldLabel: { fontSize:13, color:'#52796f', fontWeight:'600', marginBottom:6 },
  fieldInput: { borderWidth:1.5, borderColor:'#b7e4c7', borderRadius:12, padding:12, fontSize:16, color:'#1b4332', backgroundColor:'#f7faf4', marginBottom:16 },
  timeEditRow: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:12, marginBottom:24 },
  timeEditGroup: { alignItems:'center' },
  timeEditLabel: { fontSize:12, color:'#74c69d', marginBottom:6 },
  timeEditInput: { borderWidth:1.5, borderColor:'#b7e4c7', borderRadius:12, padding:12, fontSize:28, fontWeight:'700', color:'#1b4332', backgroundColor:'#f7faf4', width:80, textAlign:'center' },
  timeEditColon: { fontSize:32, fontWeight:'700', color:'#b7e4c7', marginTop:16 },
  saveBtn: { backgroundColor:'#2d6a4f', borderRadius:14, padding:15, alignItems:'center', marginBottom:10 },
  saveBtnText: { color:'#fff', fontSize:16, fontWeight:'700' },
  cancelBtn: { borderWidth:1, borderColor:'#b7e4c7', borderRadius:14, padding:13, alignItems:'center' },
  cancelBtnText: { color:'#52796f', fontSize:15 },
});
