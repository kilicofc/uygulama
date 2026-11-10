import React, { useEffect, useMemo, useRef, useState } from 'react';
import { curriculum, lessons, getLevel, levelOrder, lessonCount, placementQuestions } from './data/curriculum.js';
import { baseWords } from './data/words.js';
import { exportState, importState, loadState, saveState, todayKey } from './lib/storage.js';

const navItems = [
  { id: 'home', label: 'Ana sayfa', short: 'Ana sayfa', icon: '⌂' },
  { id: 'course', label: 'Kurslarım', short: 'Kurs', icon: '▤' },
  { id: 'words', label: 'Kelime defteri', short: 'Kelimeler', icon: 'Aa' },
  { id: 'practice', label: 'Pratik alanı', short: 'Pratik', icon: '◉' },
  { id: 'exams', label: 'Sınavlar', short: 'Sınav', icon: '✓' },
  { id: 'stats', label: 'İstatistikler', short: 'İlerleme', icon: '▥' }
];

const formatMinutes = value => value >= 60 ? `${Math.floor(value / 60)} sa ${value % 60} dk` : `${value} dk`;
const initials = name => (name || 'IR').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
const percent = (done, total) => total ? Math.round(done / total * 100) : 0;
const allCourseLessons = [...lessons];
const conversationScenarios = [
  { id: 'intro', label: 'Tanışma', level: 'A1', turns: [['A', 'Hi! I’m Alex. What’s your name?'], ['B', 'I’m Deniz. Nice to meet you.'], ['A', 'Nice to meet you too. Where are you from?'], ['B', 'I’m from Türkiye.']], prompt: 'Karşı taraf sana nereli olduğunu ve hobilerini soruyor. Kendini 3–4 cümleyle tanıt.', reply: 'I’m from Türkiye. I live in Rize. I enjoy listening to music and learning new things.' },
  { id: 'restaurant', label: 'Restoran', level: 'A1', turns: [['A', 'Are you ready to order?'], ['B', 'Yes, I’d like the chicken salad, please.'], ['A', 'Would you like something to drink?'], ['B', 'A glass of water, please.']], prompt: 'Garsona ana yemek ve içecek siparişi ver. Kibar istek kalıbı kullan.', reply: 'I’d like the grilled chicken, please. Could I also have a glass of water?' },
  { id: 'hotel', label: 'Otel', level: 'A2', turns: [['A', 'Good evening. Do you have a reservation?'], ['B', 'Yes, under the name Yılmaz.'], ['A', 'Could I see your passport, please?'], ['B', 'Of course. Is breakfast included?']], prompt: 'Otele giriş yap. Rezervasyonunu söyle ve kahvaltı saatini sor.', reply: 'I have a reservation under the name Yılmaz. Could you tell me what time breakfast is served?' },
  { id: 'airport', label: 'Havalimanı', level: 'A2', turns: [['A', 'May I see your boarding pass?'], ['B', 'Certainly. Here you are.'], ['A', 'Are you checking in any luggage?'], ['B', 'Yes, one suitcase.']], prompt: 'Kontuarda bagajın olduğunu ve uçuş kapısını öğrenmek istediğini söyle.', reply: 'I have one suitcase to check in. Could you tell me where the gate is?' },
  { id: 'shopping', label: 'Alışveriş', level: 'A2', turns: [['A', 'Can I help you find a size?'], ['B', 'Yes, do you have this in a medium?'], ['A', 'Let me check. Would you like to try it on?'], ['B', 'Yes, please.']], prompt: 'Bir ürünün başka bedenini iste ve deneme kabinini sor.', reply: 'Do you have this in a large? Could I try it on, please?' },
  { id: 'interview', label: 'İş görüşmesi', level: 'B1', turns: [['A', 'Could you tell me about your experience?'], ['B', 'I have worked in customer service for three years.'], ['A', 'What would you say is your greatest strength?'], ['B', 'I’m organised, adaptable and comfortable working in a team.']], prompt: 'Kendi deneyimini ve en güçlü iki yönünü iş görüşmesi üslubuyla anlat.', reply: 'I have experience in ... My main strengths are problem-solving and communication. I work well under pressure.' },
  { id: 'phone', label: 'Telefon görüşmesi', level: 'B1', turns: [['A', 'Hello, could I speak to Ms Taylor?'], ['B', 'I’m afraid she is in a meeting.'], ['A', 'Could I leave a message?'], ['B', 'Certainly. I’ll make sure she gets it.']], prompt: 'Aradığın kişinin toplantıda olduğunu öğren. Mesaj bırak ve geri aranmayı rica et.', reply: 'Could you let her know that I called? I’d appreciate it if she could call me back this afternoon.' },
  { id: 'doctor', label: 'Doktor', level: 'B1', turns: [['A', 'What seems to be the problem?'], ['B', 'I’ve had a headache for two days.'], ['A', 'Does anything make it worse?'], ['B', 'It gets worse when I look at a screen.']], prompt: 'Şikâyetini, ne zamandır sürdüğünü ve ne zaman arttığını açıkla.', reply: 'I’ve been experiencing ... for ... It tends to get worse when ...' },
  { id: 'friends', label: 'Arkadaşlarla sohbet', level: 'B1', turns: [['A', 'Have you seen the new series everyone is talking about?'], ['B', 'Yes, I watched the first two episodes.'], ['A', 'What did you think of it?'], ['B', 'The story is engaging, although the pacing is a little slow.']], prompt: 'İzlediğin bir film veya dizi hakkında fikrini gerekçesiyle anlat.', reply: 'I found it really engaging because ... However, I think ... could have been better.' },
  { id: 'travel', label: 'Seyahat ve sorun çözme', level: 'B2', turns: [['A', 'I’m afraid your connecting flight has been delayed.'], ['B', 'Could you explain what options are available?'], ['A', 'We can rebook you on the next service.'], ['B', 'That would be helpful. Would accommodation be provided if necessary?']], prompt: 'Uçuşunun gecikmesi üzerine alternatifleri ve konaklama desteğini nazikçe sor.', reply: 'I understand the delay is beyond your control. Could you clarify whether I can be rebooked and whether accommodation is available?' },
  { id: 'work', label: 'İş toplantısı', level: 'B2', turns: [['A', 'Shall we move on to the budget implications?'], ['B', 'Before that, could we clarify the assumptions behind the forecast?'], ['A', 'Of course. Which figures concern you?'], ['B', 'The projected growth seems rather optimistic.']], prompt: 'Bir tahmine itiraz et ve hangi varsayımların yeniden değerlendirilmesini önerdiğini açıkla.', reply: 'I’m not entirely convinced by the projected growth. It may be worth revisiting the assumptions concerning ...' },
  { id: 'debate', label: 'Tartışma ve fikir savunma', level: 'C1', turns: [['A', 'Would you argue that remote work improves productivity?'], ['B', 'It depends on how productivity is defined.'], ['A', 'Could you elaborate on that distinction?'], ['B', 'Certainly. Output may increase, whereas collaboration can require more deliberate coordination.']], prompt: 'Uzaktan çalışmanın olumlu ve olumsuz yönlerini nüanslı biçimde tartış.', reply: 'I would argue that the impact is context-dependent. While ... may improve ..., it can also ... The distinction is particularly important when ...' }
];

function speak(text, rate = 0.9) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
  return true;
}

function updateStudy(state, minutes = 5, lessonId = null) {
  const today = todayKey();
  const activity = { ...(state.activity || {}) };
  activity[today] = { minutes: (activity[today]?.minutes || 0) + minutes, lessons: (activity[today]?.lessons || 0) + (lessonId ? 1 : 0) };
  const last = state.streak?.lastDate;
  let current = state.streak?.current || 0;
  if (last !== today) {
    const yesterdayDate = new Date(`${today}T12:00:00`);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
    current = last === yesterday ? current + 1 : 1;
  }
  return { ...state, activity, streak: { current, best: Math.max(state.streak?.best || 0, current), lastDate: today } };
}

function Button({ children, variant = 'primary', size = '', onClick, disabled = false, type = 'button', className = '' }) {
  return <button type={type} className={`btn ${variant} ${size} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

function ProgressBar({ value, tone = 'blue', thin = false }) {
  return <div className={`progress-track ${thin ? 'thin' : ''}`}><div className={`progress-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function Onboarding({ onFinish, onPlacement }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState('A1');
  const [goal, setGoal] = useState(20);
  const [purpose, setPurpose] = useState('Günlük iletişim');
  const [showSystem, setShowSystem] = useState(false);
  return <div className="welcome-shell">
    <div className="welcome-glow glow-a"/><div className="welcome-glow glow-b"/>
    <div className="welcome-card">
      <div className="brand-mark large">IR<span>·</span></div>
      <div className="eyebrow">KENDİ RİTMİNDE ÖĞREN</div>
      <h1>English, in<br/><span>your rhythm.</span></h1>
      <p className="welcome-copy">İngilizce yolculuğuna küçük ama sağlam adımlarla başla. IRENGlish, öğrendiklerini günlük hayatta kullanman için yanında.</p>
      <div className="onboard-form">
        <label>Nasıl hitap edelim?</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Adın" maxLength={40} />
        <div className="form-row two">
          <div><label>Başlangıç seviyen</label><select value={level} onChange={e => setLevel(e.target.value)}>{levelOrder.map(id => <option key={id} value={id}>{id} · {getLevel(id).title}</option>)}</select></div>
          <div><label>Günlük hedefin</label><select value={goal} onChange={e => setGoal(Number(e.target.value))}><option value="10">10 dakika</option><option value="20">20 dakika</option><option value="30">30 dakika</option><option value="45">45 dakika</option><option value="60">60 dakika</option></select></div>
        </div>
        <label>İngilizceyi neden öğreniyorsun?</label>
        <select value={purpose} onChange={e => setPurpose(e.target.value)}><option>Günlük iletişim</option><option>İş ve kariyer</option><option>Yurt dışı / seyahat</option><option>Üniversite ve akademik hedefler</option><option>Sınav hazırlığı</option><option>Kişisel gelişim</option></select>
        <Button className="full" disabled={!name.trim()} onClick={() => onFinish({ name: name.trim(), level, goal, purpose })}>Öğrenmeye başla <span>→</span></Button>
        <button className="text-button" onClick={() => onPlacement({ name: name.trim() || 'Öğrenci', level, goal, purpose })}>Seviyemi test ederek belirlemek istiyorum</button>
      </div>
      <div className="welcome-foot"><span>✦</span> A1’den C1’e, adım adım.</div>
    </div>
    <aside className="welcome-side">
      <div className="side-quote"><div className="quote-mark">“</div><h2>Fluency is built<br/>one day at a time.</h2><p>Her gün biraz daha anla. Biraz daha konuş. Biraz daha kendine güven.</p></div>
      <div className="side-levels"><span>A1</span><i/><span>A2</span><i/><span>B1</span><i/><span>B2</span><i/><span>C1</span></div>
      <div className="system-note"><button onClick={() => setShowSystem(v => !v)}>Eğitim sistemi nasıl işliyor? <span>⌄</span></button>{showSystem && <p>Her seviye 5 modüle, her modül 4 derse ayrılır. Dersleri tamamladıkça sıradaki ders açılır. Kelime tekrarları, beceri pratikleri ve sınavlarla ilerlemeni takip edebilirsin.</p>}</div>
    </aside>
  </div>;
}

function Header({ state, page, onNavigate }) {
  const titles = { home: 'Genel bakış', course: 'Öğrenme yolculuğun', words: 'Kelime defterin', practice: 'Beceri atölyesi', exams: 'Sınav merkezi', stats: 'İlerlemen', settings: 'Ayarlar', admin: 'İçerik yönetimi', lesson: 'Ders alanı', placement: 'Seviye belirleme' };
  return <header className="topbar">
    <div className="mobile-brand"><div className="brand-mark">IR<span>·</span></div><span>IRENGlish</span></div>
    <div className="page-heading"><div className="eyebrow">IRENGlish / {titles[page] || 'Öğrenme alanı'}</div><h1>{titles[page] || 'Öğrenme alanı'}</h1></div>
    <div className="top-actions"><div className="xp-pill"><span>✦</span><b>{state.xp || 0}</b><small>XP</small></div><button className="profile-chip" onClick={() => onNavigate('settings')} aria-label="Profil ve ayarlar"><span className="avatar">{initials(state.profile?.name)}</span><span className="profile-name">{state.profile?.name || 'Öğrenci'}</span><span className="chevron">⌄</span></button></div>
  </header>;
}

function Sidebar({ page, navigate, profile }) {
  return <aside className="sidebar">
    <div className="brand-lockup"><div className="brand-mark">IR<span>·</span></div><div><b>IRENGlish</b><small>LEARNING STUDIO</small></div></div>
    <div className="sidebar-label">ÖĞRENME ALANI</div>
    <nav>{navItems.map(item => <button key={item.id} className={`nav-link ${page === item.id || (page === 'lesson' && item.id === 'course') || (page === 'placement' && item.id === 'exams') ? 'active' : ''}`} onClick={() => navigate(item.id)}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.id === 'words' && <span className="nav-dot"/>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="daily-mini"><div className="mini-icon">☀</div><div><b>Her gün biraz daha.</b><p>{profile?.purpose || 'Kendi ritminde ilerle.'}</p></div></div><button className={`nav-link ${page === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}><span className="nav-icon">⚙</span><span>Ayarlar</span></button><button className={`nav-link ${page === 'admin' ? 'active' : ''}`} onClick={() => navigate('admin')}><span className="nav-icon">⌘</span><span>Yönetici paneli</span></button><div className="sidebar-foot">© 2026 IRENGlish</div></div>
  </aside>;
}

function BottomNav({ page, navigate }) {
  return <nav className="bottom-nav">{navItems.slice(0, 5).map(item => <button key={item.id} className={page === item.id || (page === 'lesson' && item.id === 'course') ? 'active' : ''} onClick={() => navigate(item.id)}><span className="bottom-icon">{item.icon}</span><span>{item.short}</span></button>)}</nav>;
}

function Dashboard({ state, onNavigate, onOpenLesson, onDailyStudy }) {
  const currentLevel = getLevel(state.currentLevel || state.profile?.level || 'A1');
  const currentLessons = lessons.filter(l => l.level === currentLevel.id);
  const done = currentLessons.filter(l => state.completedLessons.includes(l.id)).length;
  const nextLesson = currentLessons.find(l => !state.completedLessons.includes(l.id)) || lessons.find(l => !state.completedLessons.includes(l.id));
  const today = state.activity?.[todayKey()] || { minutes: 0 };
  const goalProgress = Math.min(100, Math.round(today.minutes / (state.settings.dailyGoal || 20) * 100));
  const dailyWord = useMemo(() => baseWords[(new Date().getDate() * 7) % baseWords.length], []);
  const dayLabels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const bars = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - i));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { label: dayLabels[(date.getDay() + 6) % 7], value: state.activity?.[key]?.minutes || 0, today: i === 6 };
  });
  const max = Math.max(20, ...bars.map(b => b.value));
  return <div className="page-content dashboard-page">
    <section className="welcome-banner">
      <div className="welcome-text"><div className="eyebrow light">BUGÜN DE BURADASIN. HARİKA.</div><h2>Selam {state.profile?.name?.split(' ')[0] || 'öğrenci'}!<br/><span>Bir adım daha ileri.</span></h2><p>Az ama düzenli çalışma, büyük fark yaratır. Bugünkü hedefini birlikte tamamlayalım.</p><Button variant="white" onClick={() => nextLesson && onOpenLesson(nextLesson.id)}>Derse devam et <span>→</span></Button></div>
      <div className="banner-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="book-illustration"><div className="book-cover"><span>EN</span><b>YOUR<br/>NEXT<br/>CHAPTER</b><small>IRENGlish</small></div><div className="book-pages"/></div><div className="floating-tag tag-top">✦ KEEP GOING</div><div className="floating-tag tag-bottom">A1 → C1</div></div>
    </section>
    <section className="stat-grid">
      <StatCard icon="◷" label="Bugünkü çalışma" value={formatMinutes(today.minutes)} meta={`${state.settings.dailyGoal || 20} dk hedef`} tone="blue" progress={goalProgress}/>
      <StatCard icon="♨" label="Çalışma serisi" value={`${state.streak.current || 0} gün`} meta={`En iyi: ${state.streak.best || 0} gün`} tone="orange"/>
      <StatCard icon="✓" label="Tamamlanan ders" value={state.completedLessons.length} meta={`${lessonCount} dersten`} tone="green"/>
      <StatCard icon="✦" label="Toplam puan" value={state.xp || 0} meta="Öğrenme puanı" tone="purple"/>
    </section>
    <div className="dashboard-grid">
      <section className="panel continue-panel"><div className="section-heading"><div><div className="eyebrow">KALDIĞIN YERDEN</div><h3>Öğrenmeye devam et</h3></div><button className="link-button" onClick={() => onNavigate('course')}>Tüm kurslar →</button></div>
        {nextLesson ? <><div className="continue-card"><div className="lesson-symbol">{nextLesson.level}</div><div className="continue-info"><div className="lesson-meta">{nextLesson.level} · {nextLesson.moduleTitle}</div><b>{nextLesson.title}</b><p>{nextLesson.objective}</p><div className="continue-bottom"><span>{done}/20 ders tamamlandı</span><ProgressBar value={percent(done, 20)} thin/></div></div><button className="round-arrow" onClick={() => onOpenLesson(nextLesson.id)}>→</button></div><div className="daily-grammar"><span>✧</span><div><small>GÜNÜN KONU BAŞLIĞI</small><b>{nextLesson.focus}</b></div></div></> : <div className="empty-state">Tebrikler! Bu seviyedeki tüm dersleri tamamladın.</div>}
      </section>
      <section className="panel goal-panel"><div className="section-heading"><div><div className="eyebrow">GÜNLÜK HEDEF</div><h3>Bugünkü ritmin</h3></div><span className="soft-icon">◷</span></div><div className="goal-ring-wrap"><div className="goal-ring" style={{ '--progress': `${goalProgress}%` }}><div><b>{goalProgress}%</b><span>tamamlandı</span></div></div><div className="goal-caption"><b>{formatMinutes(today.minutes)} <span>/ {state.settings.dailyGoal || 20} dk</span></b><p>{goalProgress >= 100 ? 'Hedefini tamamladın. Harikasın!' : 'Biraz daha çalış, bugünkü hedefe ulaş.'}</p></div></div><Button variant="soft" className="full" onClick={onDailyStudy}>Pratik alanına geç <span>→</span></Button></section>
      <section className="panel week-panel"><div className="section-heading"><div><div className="eyebrow">ALIŞKANLIK TAKİBİ</div><h3>Son 7 gün</h3></div><span className="panel-caption">Dakika</span></div><div className="week-chart">{bars.map((bar, i) => <div className="week-col" key={i}><div className="bar-area"><div className={`week-bar ${bar.today ? 'today' : ''}`} style={{ height: `${Math.max(5, bar.value / max * 100)}%` }} title={`${bar.value} dakika`}/></div><span className={bar.today ? 'today-label' : ''}>{bar.label}</span></div>)}</div><div className="chart-foot"><span><i className="legend-dot"/> Çalışma süren</span><b>{formatMinutes(bars.reduce((sum, b) => sum + b.value, 0))} toplam</b></div></section>
      <section className="panel word-day-panel"><div className="section-heading"><div><div className="eyebrow">GÜNÜN KELİMESİ</div><h3>Bir kelime, bir adım</h3></div><span className="word-star">✦</span></div><div className="word-day"><div className="word-day-level">{dailyWord[0]} · {dailyWord[3]}</div><h2>{dailyWord[1]}</h2><div className="word-pron">/{dailyWord[4]}/ <button onClick={() => speak(dailyWord[1])}>🔊</button></div><b>{dailyWord[2]}</b><p>{dailyWord[5]}</p><small>{dailyWord[6]}</small></div><button className="link-button full-link" onClick={() => onNavigate('words')}>Kelime defterine git →</button></section>
    </div>
  </div>;
}

function StatCard({ icon, label, value, meta, tone, progress }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-meta">{meta}</div>{progress !== undefined && <ProgressBar value={progress} thin/>}</div>;
}

function CoursePage({ state, onOpenLesson, onStartPlacement, onStartLevelExam }) {
  const [selected, setSelected] = useState(state.currentLevel || 'A1');
  const level = getLevel(selected);
  const levelLessons = lessons.filter(l => l.level === selected);
  const customForLevel = (state.customLessons || []).filter(l => l.level === selected);
  const completed = levelLessons.filter(l => state.completedLessons.includes(l.id)).length;
  const levelIdx = levelOrder.indexOf(selected);
  const currentIdx = levelOrder.indexOf(state.currentLevel || 'A1');
  const isLevelOpen = selected === state.currentLevel || levelIdx < currentIdx || state.settings.freeMode;
  const isUnlocked = lesson => {
    if (state.settings.freeMode || levelIdx < currentIdx) return true;
    if (levelIdx > currentIdx) return false;
    const prior = levelLessons.findIndex(item => item.id === lesson.id) - 1;
    return prior < 0 || state.completedLessons.includes(levelLessons[prior]?.id);
  };
  return <div className="page-content">
    <div className="course-hero"><div><div className="eyebrow light">KİŞİSEL ÖĞRENME YOLCULUĞUN</div><h2>Beş seviye.<br/><span>Tek bir hedef: akıcılık.</span></h2><p>Adım adım ilerle, öğrendiklerini pekiştir ve bir sonraki seviyeye hazır ol.</p></div><div className="course-hero-badge"><div className="badge-ring">{percent(state.completedLessons.length, lessonCount)}<small>%</small></div><span>Genel ilerleme</span></div></div>
    <div className="level-tabs">{curriculum.map((item, i) => <button key={item.id} onClick={() => setSelected(item.id)} className={`level-tab ${selected === item.id ? 'active' : ''} ${item.id === state.currentLevel ? 'current' : ''}`}><b>{item.id}</b><span>{item.title}</span>{i > currentIdx && !state.settings.freeMode && <small>🔒</small>}</button>)}</div>
    <div className="level-overview panel"><div className="level-overview-title"><div className={`level-token ${level.id.toLowerCase()}`}>{level.id}</div><div><div className="eyebrow">{level.label.toUpperCase()}</div><h3>{level.title}</h3><p>{level.description}</p></div></div><div className="level-progress"><div className="level-progress-label"><b>{completed} / 20 ders</b><span>{percent(completed, 20)}%</span></div><ProgressBar value={percent(completed, 20)} tone="blue"/></div></div>
    {!isLevelOpen && <div className="locked-banner">🔒 Bu seviyeye geçmek için önce {levelOrder[levelIdx - 1]} seviyesini tamamlamalısın. Serbest çalışma modunu ayarlardan açabilirsin.</div>}
    {isLevelOpen && selected === state.currentLevel && completed === 20 && state.settings.requireLevelExam !== false && <div className="locked-banner">🎓 Bu seviyedeki 20 dersin tamamı bitti. Sonraki seviyeyi açmak için seviye sınavından en az %70 almalısın. <Button size="small" onClick={onStartLevelExam}>Seviye sınavına gir →</Button></div>}
    <div className="module-list">{level.modules.map((module, moduleIndex) => {
      const moduleLessons = levelLessons.filter(l => l.moduleIndex === moduleIndex);
      const moduleDone = moduleLessons.filter(l => state.completedLessons.includes(l.id)).length;
      return <section className="module-card panel" key={module.title}><div className="module-head"><div className="module-number">{String(moduleIndex + 1).padStart(2, '0')}</div><div className="module-text"><div className="eyebrow">MODÜL {moduleIndex + 1}</div><h3>{module.title}</h3><p>{module.subtitle}</p></div><div className="module-count"><b>{moduleDone}/4</b><span>ders</span></div></div><ProgressBar value={percent(moduleDone, 4)} thin/><div className="lesson-list">{moduleLessons.map((lesson, lessonIndex) => {
        const done = state.completedLessons.includes(lesson.id);
        const unlocked = isLevelOpen && isUnlocked(lesson);
        return <button key={lesson.id} className={`lesson-row ${done ? 'done' : ''} ${!unlocked ? 'locked' : ''}`} onClick={() => unlocked && onOpenLesson(lesson.id)} disabled={!unlocked}><span className="lesson-status">{done ? '✓' : unlocked ? '▶' : '🔒'}</span><span className="lesson-row-main"><b>{lesson.title}</b><small>Ders {lessonIndex + 1} · 8–12 dk</small></span><span className="lesson-row-right">{done ? <em>Tamamlandı</em> : unlocked ? 'Başla →' : 'Kilitli'}</span></button>;
      })}</div></section>;
    })}</div>
    {customForLevel.length > 0 && <section className="panel custom-lessons-card"><div className="eyebrow">YÖNETİCİ İÇERİĞİ</div><h3>Özel derslerin</h3>{customForLevel.map(item => <button className="lesson-row" key={item.id} onClick={() => onOpenLesson(item.id)}><span className="lesson-status">＋</span><span className="lesson-row-main"><b>{item.title}</b><small>{item.moduleTitle} · Özel ders</small></span><span className="lesson-row-right">Aç →</span></button>)}</section>}
    <div className="placement-callout"><div className="callout-icon">✧</div><div><b>Seviyenden emin değil misin?</b><p>Kısa seviye belirleme sınavıyla sana uygun başlangıç noktasını bul.</p></div><Button variant="outline" onClick={onStartPlacement}>Seviye testi <span>→</span></Button></div>
  </div>;
}

function LessonPage({ lesson, state, onBack, onComplete, onDailyPractice }) {
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);
  const [translation, setTranslation] = useState('');
  const [tab, setTab] = useState('learn');
  const [showTranslation, setShowTranslation] = useState(true);
  const [rating, setRating] = useState('');
  const questions = lesson?.questions || [];
  const score = questions.filter((item, index) => answers[index] === item.answer).length;
  const allAnswered = questions.every((_, i) => answers[i] !== undefined);
  const isDone = lesson ? state.completedLessons.includes(lesson.id) : false;
  const submitQuiz = () => setChecked(true);
  if (!lesson) return <div className="page-content"><div className="empty-state">Ders bulunamadı.</div></div>;
  return <div className="page-content lesson-page">
    <button className="back-link" onClick={onBack}>← Kursa dön</button>
    <div className="lesson-header-card"><div className="lesson-header-top"><span className="lesson-chip">{lesson.level} · {lesson.moduleTitle}</span><span className="lesson-time">◷ 8–12 dakika</span></div><h2>{lesson.title}</h2><p>{lesson.objective}</p><div className="lesson-header-bottom"><span>{isDone ? '✓ Bu ders tamamlandı' : 'Öğrenme hedefi'}</span><span className="lesson-xp">✦ +20 XP</span></div></div>
    <div className="lesson-tabs"><button className={tab === 'learn' ? 'active' : ''} onClick={() => setTab('learn')}>Konu anlatımı</button><button className={tab === 'examples' ? 'active' : ''} onClick={() => setTab('examples')}>Örnekler</button><button className={tab === 'quiz' ? 'active' : ''} onClick={() => setTab('quiz')}>Mini test</button></div>
    {tab === 'learn' && <div className="lesson-layout"><main className="lesson-main panel"><div className="eyebrow">KONUYA GİRİŞ</div><h3>{lesson.focus}</h3><p>{lesson.explanation}</p><div className="rule-box"><div className="rule-icon">✦</div><div><b>Temel mantık</b><p>{lesson.rule}</p></div></div><div className="lesson-subheading"><h3>Bu derste dikkat et</h3><span>ÖĞRENME NOTU</span></div><div className="tip-box"><span>◎</span><p>{lesson.commonMistake} Cümleyi sesli okumak ve kendi örneğini yazmak bu hatayı azaltır.</p></div><div className="lesson-subheading"><h3>İlk örnekler</h3><button className="link-button" onClick={() => setTab('examples')}>Tüm örnekler →</button></div><ExampleList examples={lesson.examples.slice(0, 3)} showTranslation={showTranslation} onToggle={() => setShowTranslation(v => !v)}/></main><aside className="lesson-aside panel"><div className="aside-card-icon">◈</div><div className="eyebrow">ÖĞRENME PLANI</div><h3>Bu derste</h3><ul className="check-list"><li><span>✓</span> Konu mantığını kavra</li><li><span>✓</span> Örnek cümleleri incele</li><li><span>✓</span> Kelimeleri tekrar et</li><li><span>✓</span> Mini testi tamamla</li></ul><div className="aside-divider"/><div className="eyebrow">KELİME DESTEĞİ</div><p>Örnekleri dinle ve sesleri taklit et. Tarayıcın seslendirmeyi destekliyorsa telaffuz pratiği yapabilirsin.</p><Button variant="soft" className="full" onClick={() => onDailyPractice()}>5 dk pratik yap</Button></aside></div>}
    {tab === 'examples' && <section className="panel examples-panel"><div className="section-heading"><div><div className="eyebrow">KULLANIM İÇİNDE İNGİLİZCE</div><h3>10 örnek cümle</h3></div><button className="link-button" onClick={() => setShowTranslation(v => !v)}>{showTranslation ? 'Çevirileri gizle' : 'Çevirileri göster'}</button></div><ExampleList examples={lesson.examples} showTranslation={showTranslation}/></section>}
    {tab === 'quiz' && <section className="panel quiz-panel"><div className="section-heading"><div><div className="eyebrow">ÖĞRENDİKLERİNİ KONTROL ET</div><h3>Mini değerlendirme</h3></div><span className="quiz-count">{Object.keys(answers).length}/{lesson.questions.length} cevap</span></div><p className="muted">Her soruyu dikkatlice oku. Yanlış cevaplarda doğru seçeneği ve nedenini göreceksin.</p>{lesson.questions.map((item, index) => <div className="question-card" key={index}><div className="question-no">Soru {index + 1}</div><h4>{item.question}</h4><div className="answer-options">{item.options.map((option, optionIndex) => <button key={optionIndex} className={`answer-option ${answers[index] === optionIndex ? 'selected' : ''} ${checked && optionIndex === item.answer ? 'correct' : ''} ${checked && answers[index] === optionIndex && optionIndex !== item.answer ? 'incorrect' : ''}`} onClick={() => { if (!checked) setAnswers(prev => ({ ...prev, [index]: optionIndex })); }} disabled={checked}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{checked && optionIndex === item.answer && <b>✓</b>}</button>)}</div>{checked && <div className={`answer-feedback ${answers[index] === item.answer ? 'good' : 'bad'}`}><b>{answers[index] === item.answer ? 'Doğru cevap!' : `Doğru cevap: ${item.options[item.answer]}`}</b><p>{item.why}</p></div>}</div>)}{!checked ? <Button className="full" disabled={!allAnswered} onClick={submitQuiz}>Cevapları kontrol et</Button> : <div className="quiz-result"><div className={`result-score ${score >= 3 ? 'success' : 'retry'}`}>{score}/{lesson.questions.length}</div><div><b>{score >= 3 ? 'Güzel iş! Dersi tamamladın.' : 'Bir tur daha çalışalım.'}</b><p>{score >= 3 ? 'Sonraki dersin kilidi açıldı.' : 'Açıklamaları gözden geçirip tekrar deneyebilirsin.'}</p></div><div className="result-actions"><Button variant="outline" onClick={() => { setAnswers({}); setChecked(false); }}>Tekrar dene</Button>{score >= 3 && <Button onClick={() => onComplete(lesson.id, score)}>Dersi tamamla <span>→</span></Button>}</div></div>}</section>}
    <div className="lesson-footer"><span>İlerlemek için mükemmel olmak zorunda değilsin; devam etmen yeterli.</span><span>IRENGlish · {lesson.level}</span></div>
  </div>;
}

function ExampleList({ examples, showTranslation, onToggle }) {
  return <div className="example-list">{examples.map((example, index) => <div className="example-row" key={index}><span className="example-index">{String(index + 1).padStart(2, '0')}</span><div className="example-content"><b>{example.en}</b>{showTranslation && <p>{example.tr}</p>}</div><button className="sound-button" onClick={() => speak(example.en)} aria-label="Cümleyi dinle">🔊</button></div>)}</div>;
}

function WordsPage({ state, updateState }) {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState('all');
  const [filter, setFilter] = useState('all');
  const words = useMemo(() => [...baseWords, ...(state.customWords || [])], [state.customWords]);
  const now = Date.now();
  const visible = words.filter(word => {
    const match = `${word.word} ${word.meaning} ${word.example}`.toLocaleLowerCase('tr-TR').includes(query.toLocaleLowerCase('tr-TR'));
    const levelMatch = level === 'all' || word.level === level;
    const progress = state.wordProgress?.[word.id];
    const filterMatch = filter === 'all' || (filter === 'saved' && progress?.saved) || (filter === 'review' && progress?.nextAt && progress.nextAt <= now) || (filter === 'new' && !progress?.known);
    return match && levelMatch && filterMatch;
  });
  const setWordStatus = (word, known) => {
    updateState(prev => {
      const old = prev.wordProgress?.[word.id] || {};
      const interval = known ? Math.min((old.interval || 0) + 1, 5) : 0;
      const days = [0, 1, 3, 7, 14, 30][interval];
      return { ...prev, wordProgress: { ...(prev.wordProgress || {}), [word.id]: { ...old, known, interval, nextAt: Date.now() + (known ? days * 86400000 : 10 * 60000), lastReviewed: Date.now(), saved: old.saved || false } } };
    });
  };
  const toggleSaved = word => updateState(prev => { const old = prev.wordProgress?.[word.id] || {}; return { ...prev, wordProgress: { ...(prev.wordProgress || {}), [word.id]: { ...old, saved: !old.saved } } }; });
  const dueCount = words.filter(word => state.wordProgress?.[word.id]?.nextAt && state.wordProgress[word.id].nextAt <= now).length;
  const knownCount = words.filter(word => state.wordProgress?.[word.id]?.known).length;
  return <div className="page-content">
    <div className="words-hero"><div><div className="eyebrow light">KELİME DAĞARCIĞINI BÜYÜT</div><h2>Words make<br/><span>the world wider.</span></h2><p>Kelimeleri yalnızca ezberleme. Cümle içinde gör, dinle ve aralıklı tekrar sistemiyle kalıcı hâle getir.</p></div><div className="words-stat"><div><b>{knownCount}</b><small>öğrenildi</small></div><div><b>{dueCount}</b><small>tekrar zamanı</small></div><div><b>{words.length}</b><small>toplam kelime</small></div></div></div>
    <div className="word-controls"><div className="search-input"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Kelime veya anlam ara..."/></div><select value={level} onChange={e => setLevel(e.target.value)}><option value="all">Tüm seviyeler</option>{levelOrder.map(item => <option key={item}>{item}</option>)}</select></div>
    <div className="filter-tabs">{[{ id: 'all', label: 'Tüm kelimeler' }, { id: 'new', label: 'Yeni / çalışılacak' }, { id: 'review', label: `Tekrar zamanı ${dueCount ? `(${dueCount})` : ''}` }, { id: 'saved', label: 'Favorilerim' }].map(item => <button key={item.id} onClick={() => setFilter(item.id)} className={filter === item.id ? 'active' : ''}>{item.label}</button>)}</div>
    {visible.length ? <div className="word-grid">{visible.map(word => {
      const progress = state.wordProgress?.[word.id] || {};
      return <article className="word-card" key={word.id}><div className="word-card-top"><span className={`level-tag ${word.level.toLowerCase()}`}>{word.level}</span><button className={`favorite-button ${progress.saved ? 'saved' : ''}`} onClick={() => toggleSaved(word)} aria-label="Favoriye ekle">{progress.saved ? '★' : '☆'}</button></div><h3>{word.word}</h3><div className="word-pron">/{word.pronunciation}/ <button onClick={() => speak(word.word)}>🔊</button></div><b className="word-meaning">{word.meaning}</b><p className="word-example">{word.example}</p><small className="word-translation">{word.translation}</small><div className="word-card-foot"><button className="word-review miss" onClick={() => setWordStatus(word, false)}>Tekrar et</button><button className="word-review know" onClick={() => setWordStatus(word, true)}>Biliyorum ✓</button></div></article>;
    })}</div> : <div className="empty-state">Bu filtrede kelime yok. Arama veya seviye filtresini değiştirebilirsin.</div>}
    <div className="srs-note"><span>◷</span><div><b>Akıllı tekrar nasıl çalışır?</b><p>Bildiğin kelimelerin tekrar aralığı 1, 3, 7, 14 ve 30 güne çıkar. Zorlandığın kelimeler 10 dakika sonra yeniden karşına gelir.</p></div></div>
  </div>;
}

function FocusTimer({ onFinish }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  const display = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const finish = () => {
    setRunning(false);
    if (seconds > 0) onFinish(Math.max(1, Math.round(seconds / 60)));
    setSeconds(0);
  };
  return <div className="focus-timer"><div><div className="eyebrow">ODAKLANMA SAYACI</div><b>{display}</b><small>Çalıştığın süreyi gerçek zamanlı kaydet.</small></div><div className="timer-actions">{!running ? <Button variant="soft" onClick={() => setRunning(true)}>{seconds ? 'Devam et ▶' : 'Başlat ▶'}</Button> : <Button variant="outline" onClick={() => setRunning(false)}>Duraklat Ⅱ</Button>}{(seconds > 0 || running) && <Button variant="primary" onClick={finish}>Bitir ve kaydet</Button>}</div></div>;
}

function PracticePage({ state, updateState }) {
  const [skill, setSkill] = useState('reading');
  const [showReadingAnswer, setShowReadingAnswer] = useState(false);
  const [readingAnswer, setReadingAnswer] = useState('');
  const [listeningAnswer, setListeningAnswer] = useState('');
  const [writing, setWriting] = useState('');
  const [writingFeedback, setWritingFeedback] = useState(null);
  const [recognition, setRecognition] = useState('');
  const [recording, setRecording] = useState(false);
  const [scenarioId, setScenarioId] = useState('intro');
  const [scenarioReply, setScenarioReply] = useState('');
  const [showScenarioExample, setShowScenarioExample] = useState(false);
  const recognitionRef = useRef(null);
  const level = state.currentLevel || 'A1';
  const story = level === 'A1' ? { title: 'A Day at the Market', text: 'Emma goes to the market every Saturday. She buys fresh fruit, bread and milk. Today, she is looking for a birthday cake for her brother. The shop assistant shows her three cakes. Emma chooses a chocolate cake because her brother loves chocolate.', question: 'Why does Emma choose the chocolate cake?', options: ['It is the cheapest.', 'Her brother loves chocolate.', 'It is very small.'], answer: 1, reason: 'Metinde “because her brother loves chocolate” deniyor.' } : level === 'A2' ? { title: 'A Weekend by the Sea', text: 'Last weekend, Daniel travelled to a small town by the sea. He had planned the trip for weeks, but the weather was colder than he expected. On Saturday, he visited a local museum and tried a traditional fish dish. He is going to return in summer with his friends.', question: 'What is Daniel planning to do in summer?', options: ['Move to the town.', 'Return with his friends.', 'Open a museum.'], answer: 1, reason: 'Son cümlede yazın arkadaşlarıyla geri dönmeyi planladığı söyleniyor.' } : { title: 'Learning Beyond the Classroom', text: 'Formal instruction provides structure, but meaningful progress often depends on how learners engage with a language outside the classroom. Podcasts, authentic conversations and deliberate reading expose students to context, register and nuance. Rather than treating mistakes as evidence of failure, effective learners regard them as information that can guide the next stage of practice.', question: 'According to the text, how should learners view mistakes?', options: ['As a reason to stop.', 'As information that guides further practice.', 'As proof that formal lessons are useless.'], answer: 1, reason: 'Metin, hataların sonraki çalışma aşamasını yönlendiren bilgi olarak görülmesini öneriyor.' };
  const listeningText = level === 'A1' ? 'Hi, can I help you? Yes, please. I would like a cup of tea and a cheese sandwich. Certainly. Anything else? No, thank you.' : level === 'A2' ? 'Good afternoon. I have a reservation for two nights. Certainly. Could I have your passport, please? Of course. Is breakfast included? Yes, it is served from seven until ten.' : 'Although the initial results were promising, the research team decided to conduct a larger trial. They wanted to determine whether the observed effect was consistent across different age groups.';
  const startSpeaking = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setRecognition('Bu tarayıcı mikrofonla konuşmayı yazıya çevirme özelliğini desteklemiyor. Cümleyi aşağıdaki alana yazarak yine pratik yapabilirsin.'); return; }
    const recognitionApi = new SpeechRecognition();
    recognitionApi.lang = 'en-US'; recognitionApi.interimResults = true; recognitionApi.continuous = false;
    recognitionApi.onresult = event => setRecognition(Array.from(event.results).map(result => result[0].transcript).join(' '));
    recognitionApi.onerror = event => setRecognition(`Mikrofon hatası: ${event.error}. İzinleri kontrol edip tekrar deneyebilirsin.`);
    recognitionApi.onend = () => setRecording(false);
    recognitionRef.current = recognitionApi;
    try { recognitionApi.start(); setRecording(true); setRecognition('Dinliyorum… İngilizce cümleni söyle.'); } catch { setRecording(false); setRecognition('Mikrofon başlatılamadı. Tarayıcı izinlerini kontrol et.'); }
  };
  const checkWriting = () => {
    const text = writing.trim(); const feedback = [];
    if (text.split(/\s+/).filter(Boolean).length < 8) feedback.push('Biraz daha ayrıntı ekle. En az 8–10 kelimelik bir paragraf yazmayı dene.');
    if (text && text[0] !== text[0].toUpperCase()) feedback.push('İngilizcede cümleye büyük harfle başlamalısın.');
    if (text && !/[.!?]$/.test(text)) feedback.push('Cümlenin sonuna uygun bir noktalama işareti ekle.');
    if (/\bI am agree\b/i.test(text)) feedback.push('“I am agree” yerine “I agree” kullanılır. Agree fiildir.');
    if (/\b(he|she|it) go\b/i.test(text)) feedback.push('Simple Present olumlu cümlede he/she/it ile “goes” kullanılır.');
    if (/\b(didn't|did not) went\b/i.test(text)) feedback.push('Did yardımcı fiilinden sonra fiilin yalın hâli gelir: “didn’t go”.');
    if (/\badvices\b/i.test(text)) feedback.push('Advice sayılamayan isimdir; “advices” değil “advice” kullanılır.');
    if (!feedback.length) feedback.push('Temel yazım kontrollerinde belirgin bir hata yakalanmadı. Bu otomatik kontrol, tam bir dil bilgisi veya yapay zekâ değerlendirmesi değildir.');
    setWritingFeedback(feedback);
  };
  useEffect(() => () => { if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} } }, []);
  return <div className="page-content">
    <div className="practice-hero"><div className="eyebrow light">FOUR SKILLS, ONE JOURNEY</div><h2>İngilizceyi sadece öğrenme.<br/><span>Kullan.</span></h2><p>Reading, Listening, Speaking ve Writing. Her beceriyi kendi seviyende, kısa pratiklerle geliştir.</p></div>
    <FocusTimer onFinish={minutes => updateState(prev => updateStudy({ ...prev, xp: (prev.xp || 0) + Math.min(10, minutes) }, minutes))} />
    <div className="skill-tabs">{[{ id: 'reading', title: 'Reading', tr: 'Okuma', icon: '▤' }, { id: 'listening', title: 'Listening', tr: 'Dinleme', icon: '◖' }, { id: 'speaking', title: 'Speaking', tr: 'Konuşma', icon: '◉' }, { id: 'writing', title: 'Writing', tr: 'Yazma', icon: '✎' }].map(item => <button key={item.id} onClick={() => setSkill(item.id)} className={skill === item.id ? 'active' : ''}><span>{item.icon}</span><b>{item.title}</b><small>{item.tr}</small></button>)}</div>
    {skill === 'reading' && <section className="panel skill-panel"><div className="skill-meta"><span className="level-tag">{level}</span><span>5–8 dakika · Okuduğunu anlama</span></div><h3>{story.title}</h3><p className="reading-text">{story.text}</p><div className="reading-question"><b>{story.question}</b><div className="answer-options">{story.options.map((option, index) => <button key={option} className={`answer-option ${readingAnswer === String(index) ? 'selected' : ''} ${showReadingAnswer && index === story.answer ? 'correct' : ''}`} onClick={() => setReadingAnswer(String(index))}><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{showReadingAnswer && <div className="answer-feedback good"><b>{Number(readingAnswer) === story.answer ? 'Doğru cevap!' : 'Doğru cevabı birlikte inceleyelim.'}</b><p>{story.reason}</p></div>}<Button onClick={() => setShowReadingAnswer(true)} disabled={!readingAnswer}>Cevabı kontrol et</Button></div></section>}
    {skill === 'listening' && <section className="panel skill-panel"><div className="skill-meta"><span className="level-tag">{level}</span><span>2–4 dakika · Dinleme</span></div><div className="listening-art"><div className="sound-wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div><div className="eyebrow">DİNLEME PARÇASI</div><h3>Listen carefully.</h3><p>Metni farklı hızlarda dinle. Önce anlamaya çalış, sonra metni açarak kontrol et.</p></div></div><div className="audio-controls"><Button onClick={() => speak(listeningText, state.settings.speechRate)}><span>▶</span> Dinlet</Button><label>Hız<select value={state.settings.speechRate} onChange={e => updateState(prev => ({ ...prev, settings: { ...prev.settings, speechRate: Number(e.target.value) } }))}><option value="0.7">Yavaş</option><option value="0.9">Normal</option><option value="1.1">Hızlı</option></select></label></div><details className="transcript-box"><summary>İngilizce metni göster</summary><p>{listeningText}</p><button className="link-button" onClick={() => speak(listeningText, state.settings.speechRate)}>Metni tekrar dinle 🔊</button></details><div className="listening-note">Ses, cihazın veya tarayıcının SpeechSynthesis sesleriyle üretilir. Önceden kaydedilmiş bir konuşma dosyası değildir.</div></section>}
    {skill === 'speaking' && <section className="panel skill-panel speaking-panel"><div className="skill-meta"><span className="level-tag">{level}</span><span>3–5 dakika · Telaffuz ve akıcılık</span></div><div className="speaking-prompt"><div className="mic-orbit"><div className="mic-core">🎙</div></div><div><div className="eyebrow">BUGÜNÜN KONUŞMA GÖREVİ</div><h3>Introduce yourself.</h3><p>Adını, yaşadığın yeri, ilgi alanlarını ve İngilizce öğrenme nedenini 4–5 cümleyle anlat.</p><button className="link-button" onClick={() => speak('Hello! My name is… I live in… In my free time, I enjoy… I am learning English because…')}>Örnek cümleleri dinle 🔊</button></div></div><Button onClick={recording ? () => { recognitionRef.current?.stop(); setRecording(false); } : startSpeaking} variant={recording ? 'danger' : 'primary'} className="full">{recording ? 'Kaydı bitir' : 'Mikrofonla konuş'} {recording ? '■' : '●'}</Button><div className="speech-result"><b>Algılanan konuşma</b><p>{recognition || 'Mikrofonu başlattığında söylediğin sözler burada görünecek.'}</p></div><div className="listening-note">Mikrofon özelliği tarayıcı desteğine ve izinlerine bağlıdır. Desteklenmiyorsa cümlelerini yazılı olarak prova edebilirsin.</div><div className="scenario-practice"><div className="section-heading"><div><div className="eyebrow">GERÇEK HAYAT SENARYOLARI</div><h3>Konuşma pratiğini seç</h3></div><span className="panel-caption">12 senaryo</span></div><select value={scenarioId} onChange={e => { setScenarioId(e.target.value); setScenarioReply(''); setShowScenarioExample(false); }}>{conversationScenarios.map(item => <option key={item.id} value={item.id}>{item.label} · {item.level}</option>)}</select>{(() => { const current = conversationScenarios.find(item => item.id === scenarioId); return <><div className="scenario-dialogue">{current.turns.map((turn, i) => <div className={`dialogue-line ${turn[0] === 'B' ? 'right' : ''}`} key={i}><span>{turn[0]}</span><p>{turn[1]}</p><button onClick={() => speak(turn[1])}>🔊</button></div>)}</div><div className="scenario-task"><b>Senin görevin</b><p>{current.prompt}</p><textarea rows="3" value={scenarioReply} onChange={e => { setScenarioReply(e.target.value); setShowScenarioExample(false); }} placeholder="Answer in English..."/><button className="link-button" onClick={() => setShowScenarioExample(v => !v)}>{showScenarioExample ? 'Örnek yanıtı gizle' : 'Örnek yanıtı gör'}</button>{showScenarioExample && <div className="scenario-example">{current.reply}<button onClick={() => speak(current.reply)}>🔊</button></div>}</div></>; })()}</div></section>}
    {skill === 'writing' && <section className="panel skill-panel"><div className="skill-meta"><span className="level-tag">{level}</span><span>5–10 dakika · Yazılı anlatım</span></div><div className="eyebrow">KISA YAZMA GÖREVİ</div><h3>{level === 'A1' ? 'Write about your daily routine.' : level === 'A2' ? 'Write about a memorable weekend.' : 'Present an argument and support it with evidence.'}</h3><p className="muted">{level === 'A1' ? 'Günlük rutinini 5–6 cümleyle anlat. Simple Present kullan.' : level === 'A2' ? 'Unutamadığın bir hafta sonunu 6–8 cümleyle anlat. Past Simple kullan.' : 'Bir görüşünü açıkça ifade et, gerekçelendir ve bir örnekle destekle.'}</p><textarea rows="7" value={writing} onChange={e => { setWriting(e.target.value); setWritingFeedback(null); }} placeholder="Start writing in English..."/><div className="writing-meta"><span>{writing.trim() ? writing.trim().split(/\s+/).length : 0} kelime</span><span>Otomatik temel kontrol</span></div><Button onClick={checkWriting} disabled={!writing.trim()}>Yazımı kontrol et</Button>{writingFeedback && <div className="writing-feedback"><b>Kontrol notları</b>{writingFeedback.map((item, i) => <p key={i}>• {item}</p>)}</div>}<div className="listening-note">Bu bölüm temel kural tabanlı kontroller yapar. Gelişmiş yapay zekâ değerlendirmesi veya tam essay puanlaması sunmaz.</div></section>}
  </div>;
}

function ExamsPage({ onPlacement, onLevelExam, state }) {
  const history = state.examHistory || [];
  return <div className="page-content">
    <div className="exam-hero"><div className="eyebrow light">TEST YOURSELF</div><h2>Bilgini ölç.<br/><span>Gelişimini gör.</span></h2><p>Seviye belirleme, modül testleri ve genel tekrar sınavlarıyla bir sonraki adıma ne kadar hazır olduğunu keşfet.</p></div>
    <div className="exam-grid"><article className="exam-card featured"><div className="exam-card-icon">⌁</div><span className="exam-kind">BAŞLANGIÇ TESTİ</span><h3>Seviye belirleme</h3><p>Gramer, kelime ve anlam bilgisini ölç. Sana uygun başlangıç seviyesini önerelim.</p><div className="exam-meta"><span>12 soru</span><span>10–15 dakika</span><span>A1–C1</span></div><Button onClick={onPlacement}>Teste başla <span>→</span></Button></article><article className="exam-card"><div className="exam-card-icon purple">▤</div><span className="exam-kind">SEVİYE SINAVI</span><h3>{state.currentLevel} seviye değerlendirmesi</h3><p>Şu an çalıştığın seviyedeki temel yapıları karışık sorularla tekrar et.</p><div className="exam-meta"><span>20 soru</span><span>15–20 dakika</span><span>%70 geçme notu</span></div><Button variant="soft" onClick={onLevelExam}>Sınava gir <span>→</span></Button></article><article className="exam-card"><div className="exam-card-icon orange">↗</div><span className="exam-kind">GELİŞİM TAKİBİ</span><h3>Önceki sonuçların</h3><p>Geçmiş testlerini incele ve gelişimini zaman içinde karşılaştır.</p><div className="exam-meta"><span>{history.length} sınav</span><span>{history.length ? `${Math.max(...history.map(h => h.percent))}% en iyi sonuç` : 'Henüz sonuç yok'}</span></div><Button variant="outline" onClick={() => document.getElementById('exam-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Sonuçları gör ↓</Button></article></div>
    <section className="panel history-panel" id="exam-history"><div className="section-heading"><div><div className="eyebrow">SINAV GEÇMİŞİ</div><h3>Son değerlendirmelerin</h3></div><span className="panel-caption">{history.length} kayıt</span></div>{history.length ? <div className="history-list">{[...history].reverse().map((item, index) => <div className="history-row" key={`${item.date}-${index}`}><div className="history-symbol">✓</div><div><b>{item.title}</b><small>{new Date(item.date).toLocaleString('tr-TR')}</small></div><span className={`history-score ${item.percent >= 70 ? 'pass' : 'retry'}`}>{item.percent}%</span></div>)}</div> : <div className="empty-state compact">Henüz sınav tamamlamadın. İlk testin burada görünecek.</div>}</section>
  </div>;
}

function PlacementPage({ onBack, onFinish }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const score = placementQuestions.filter((item, i) => answers[i] === item.answer).length;
  const recommended = score <= 2 ? 'A1' : score <= 4 ? 'A2' : score <= 6 ? 'B1' : score <= 9 ? 'B2' : 'C1';
  return <div className="page-content placement-page"><button className="back-link" onClick={onBack}>← Geri dön</button><div className="panel placement-panel"><div className="eyebrow">LEVEL CHECK · 01 / 12</div><h2>İngilizce seviyeni<br/><span>birlikte keşfedelim.</span></h2><p>Bu kısa değerlendirme gramer ve kelime bilgisini ölçer. Dört becerinin tamamını ölçen resmî bir CEFR sınavı değildir; sonuç başlangıç önerisidir.</p><ProgressBar value={Object.keys(answers).length / placementQuestions.length * 100} thin/>{!submitted ? <><div className="placement-questions">{placementQuestions.map((item, i) => <div className="question-card" key={i}><div className="question-no">Soru {i + 1} / {placementQuestions.length}</div><h4>{item.question}</h4><div className="answer-options">{item.options.map((option, j) => <button key={j} className={`answer-option ${answers[i] === j ? 'selected' : ''}`} onClick={() => setAnswers(prev => ({ ...prev, [i]: j }))}><span>{String.fromCharCode(65 + j)}</span>{option}</button>)}</div></div>)}</div><Button className="full" disabled={Object.keys(answers).length !== placementQuestions.length} onClick={() => setSubmitted(true)}>Sonucu hesapla</Button></> : <div className="placement-result"><div className="result-score success">{score}/{placementQuestions.length}</div><div className="eyebrow">ÖNERİLEN BAŞLANGIÇ</div><h3>{recommended} · {getLevel(recommended).title}</h3><p>{getLevel(recommended).description}</p><Button onClick={() => onFinish(recommended, score)}>Bu seviyeden başla <span>→</span></Button><button className="text-button" onClick={() => { setAnswers({}); setSubmitted(false); }}>Testi yeniden çöz</button></div>}</div></div>;
}

function StatsPage({ state }) {
  const totalMinutes = Object.values(state.activity || {}).reduce((sum, day) => sum + (day.minutes || 0), 0);
  const wordsKnown = Object.values(state.wordProgress || {}).filter(item => item.known).length;
  const weekly = Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() - (6 - i)); const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; return { key, minutes: state.activity?.[key]?.minutes || 0, label: date.toLocaleDateString('tr-TR', { weekday: 'short' }) }; });
  const max = Math.max(1, ...weekly.map(item => item.minutes));
  const levelStats = curriculum.map(level => { const count = lessons.filter(l => l.level === level.id).length; const done = lessons.filter(l => l.level === level.id && state.completedLessons.includes(l.id)).length; return { ...level, count, done }; });
  return <div className="page-content"><div className="stats-hero"><div className="eyebrow light">YOUR PROGRESS, YOUR PACE</div><h2>Her tekrar<br/><span>seni güçlendiriyor.</span></h2><p>Bu alan gerçek çalışma kayıtlarını, tamamladığın dersleri ve kelime tekrarlarını gösterir.</p></div><div className="stat-grid stats-summary"><StatCard icon="◷" label="Toplam çalışma" value={formatMinutes(totalMinutes)} meta="Kaydedilen süre" tone="blue"/><StatCard icon="✓" label="Tamamlanan ders" value={state.completedLessons.length} meta={`${lessonCount} toplam ders`} tone="green"/><StatCard icon="Aa" label="Öğrenilen kelime" value={wordsKnown} meta="Bildiğim kelimeler" tone="purple"/><StatCard icon="♨" label="En iyi seri" value={`${state.streak.best || 0} gün`} meta="Aralıksız çalışma" tone="orange"/></div><div className="stats-grid"><section className="panel"><div className="section-heading"><div><div className="eyebrow">ÇALIŞMA SÜREN</div><h3>Haftalık aktivite</h3></div></div><div className="stats-bars">{weekly.map(day => <div key={day.key} className="stats-bar-col"><div className="stats-bar-wrap"><div className="stats-bar" style={{ height: `${Math.max(3, day.minutes / max * 100)}%` }}/></div><span>{day.label}</span><small>{day.minutes} dk</small></div>)}</div></section><section className="panel"><div className="section-heading"><div><div className="eyebrow">CEFR YOLCULUĞU</div><h3>Seviyelere göre ilerleme</h3></div></div><div className="level-progress-list">{levelStats.map(level => <div className="level-progress-item" key={level.id}><div className={`level-token small ${level.id.toLowerCase()}`}>{level.id}</div><div className="level-progress-main"><div><b>{level.title}</b><span>{level.done}/{level.count}</span></div><ProgressBar value={percent(level.done, level.count)} thin/></div></div>)}</div></section></div><div className="insight-box"><span>✧</span><div><b>Küçük not</b><p>IRENGlish yalnızca bu cihazda kaydedilen çalışma sürelerini ve tamamlanan etkinlikleri raporlar. Başka cihazlardaki kullanımın otomatik olarak senkronize edilmez.</p></div></div></div>;
}

function SettingsPage({ state, updateState, onReset }) {
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);
  const change = (key, value) => updateState(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
  const handleImport = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { const next = await importState(file); updateState(() => next); setMessage('Yedek başarıyla geri yüklendi.'); }
    catch (error) { setMessage(error.message || 'Dosya içe aktarılamadı.'); }
    event.target.value = '';
  };
  return <div className="page-content settings-page"><div className="settings-hero"><div className="eyebrow light">PERSONALISE YOUR SPACE</div><h2>Çalışma alanın,<br/><span>senin kuralların.</span></h2><p>Görünümü, hedeflerini ve öğrenme şeklini kendine göre düzenle.</p></div><div className="settings-layout"><main className="settings-main"><section className="panel settings-card"><div className="settings-title"><div className="settings-icon">◐</div><div><h3>Görünüm</h3><p>IRENGlish nasıl görünsün?</p></div></div><div className="settings-row"><div><b>Tema</b><small>Açık veya koyu görünüm</small></div><div className="segmented">{['light','dark','system'].map(theme => <button key={theme} className={state.settings.theme === theme ? 'active' : ''} onClick={() => change('theme', theme)}>{theme === 'light' ? 'Açık' : theme === 'dark' ? 'Koyu' : 'Sistem'}</button>)}</div></div><div className="settings-row"><div><b>Yazı boyutu</b><small>Ekrandaki metinleri büyüt veya küçült</small></div><div className="font-control"><button onClick={() => change('fontScale', Math.max(0.9, Number((state.settings.fontScale - 0.05).toFixed(2))))}>A−</button><span>{Math.round(state.settings.fontScale * 100)}%</span><button onClick={() => change('fontScale', Math.min(1.2, Number((state.settings.fontScale + 0.05).toFixed(2))))}>A+</button></div></div></section>
    <section className="panel settings-card"><div className="settings-title"><div className="settings-icon green">◎</div><div><h3>Çalışma hedefi</h3><p>Günlük ritmini belirle.</p></div></div><div className="settings-row"><div><b>Günlük çalışma süresi</b><small>Her gün ayırmak istediğin süre</small></div><select value={state.settings.dailyGoal} onChange={e => change('dailyGoal', Number(e.target.value))}><option value="10">10 dakika</option><option value="20">20 dakika</option><option value="30">30 dakika</option><option value="45">45 dakika</option><option value="60">60 dakika</option></select></div><div className="settings-row"><div><b>Serbest çalışma modu</b><small>Ders kilitlerini kaldırır, sıralamayı isteğe bağlı yapar.</small></div><button className={`toggle ${state.settings.freeMode ? 'on' : ''}`} onClick={() => change('freeMode', !state.settings.freeMode)} aria-label="Serbest çalışma modu"><i/></button></div><div className="settings-row"><div><b>Seslendirme hızı</b><small>Dinleme ve örnek cümlelerde kullanılır.</small></div><select value={state.settings.speechRate} onChange={e => change('speechRate', Number(e.target.value))}><option value="0.7">Yavaş</option><option value="0.9">Normal</option><option value="1.1">Hızlı</option></select></div></section>
    <section className="panel settings-card"><div className="settings-title"><div className="settings-icon purple">♙</div><div><h3>Profil bilgileri</h3><p>Kişisel çalışma ayarların.</p></div></div><div className="profile-edit"><label>Adın<input value={state.profile?.name || ''} onChange={e => updateState(prev => ({ ...prev, profile: { ...prev.profile, name: e.target.value } }))}/></label><label>Öğrenme amacın<select value={state.profile?.purpose || 'Günlük iletişim'} onChange={e => updateState(prev => ({ ...prev, profile: { ...prev.profile, purpose: e.target.value } }))}>{['Günlük iletişim','İş ve kariyer','Yurt dışı / seyahat','Üniversite ve akademik hedefler','Sınav hazırlığı','Kişisel gelişim'].map(p => <option key={p}>{p}</option>)}</select></label></div></section>
    <section className="panel settings-card"><div className="settings-title"><div className="settings-icon orange">⇄</div><div><h3>Veri ve yedekleme</h3><p>Verilerin bu cihazda saklanır.</p></div></div><div className="settings-row"><div><b>Yedeği dışa aktar</b><small>İlerleme, hedefler ve kelime kayıtlarını JSON olarak indir.</small></div><Button variant="outline" onClick={() => exportState(state)}>Yedek indir ↓</Button></div><div className="settings-row"><div><b>Yedeği geri yükle</b><small>Önceden aldığın IRENGlish JSON yedeğini seç.</small></div><Button variant="soft" onClick={() => fileRef.current?.click()}>Dosya seç ↑</Button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={handleImport}/></div>{message && <div className="inline-message">{message}</div>}<div className="settings-row danger-row"><div><b>Öğrenme verilerini sıfırla</b><small>Ders ilerlemesi, puan ve çalışma geçmişi silinir.</small></div><Button variant="danger-outline" onClick={onReset}>Verileri sıfırla</Button></div></section></main><aside className="settings-side panel"><div className="side-profile-avatar">{initials(state.profile?.name)}</div><h3>{state.profile?.name}</h3><p>{state.profile?.purpose}</p><div className="side-profile-level">{state.currentLevel} <span>MEVCUT SEVİYE</span></div><div className="aside-divider"/><div className="eyebrow">GİZLİLİK</div><p>Profilin ve ilerlemen bu cihazın yerel depolamasında tutulur. Hesap sistemi ve bulut senkronizasyonu bu sürümde bulunmuyor.</p><div className="privacy-status"><span>●</span> Yerel kayıt etkin</div></aside></div></div>;
}

function AdminPage({ state, updateState }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [wordForm, setWordForm] = useState({ level: 'A1', word: '', meaning: '', type: 'noun', pronunciation: '', example: '', translation: '' });
  const [lessonForm, setLessonForm] = useState({ level: 'A1', moduleTitle: 'Özel dersler', title: '', focus: '', rule: '' });
  const [editingWordId, setEditingWordId] = useState(null);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [adminTab, setAdminTab] = useState('overview');
  const [note, setNote] = useState('');
  const fileRef = useRef(null);
  const unlock = () => { if (pin === (state.adminPin || '2468')) { setUnlocked(true); setError(''); } else setError('PIN hatalı. Yerel yönetici PIN’i varsayılan olarak 2468.'); };
  const addWord = event => {
    event.preventDefault();
    if (editingWordId) updateState(prev => ({ ...prev, customWords: (prev.customWords || []).map(item => item.id === editingWordId ? { ...wordForm, id: editingWordId } : item) }));
    else { const id = `custom-word-${Date.now()}`; updateState(prev => ({ ...prev, customWords: [...(prev.customWords || []), { ...wordForm, id }] })); }
    setWordForm({ level: 'A1', word: '', meaning: '', type: 'noun', pronunciation: '', example: '', translation: '' }); setEditingWordId(null); setNote('Kelime kaydedildi.');
  };
  const lessonPayload = id => ({ ...lessonForm, id, moduleIndex: 99, lessonIndex: 0, moduleSubtitle: 'Yönetici tarafından eklendi', objective: `Bu dersin sonunda ${lessonForm.title} konusunu kullanabileceksin.`, explanation: lessonForm.focus, commonMistake: 'Örneği kendi cümlenle yeniden kurmayı unutma.', examples: Array.from({ length: 10 }, (_, i) => ({ en: i === 0 ? 'Create your own example sentence.' : `Practise ${lessonForm.title.toLowerCase()} in a new sentence (${i + 1}).`, tr: i === 0 ? 'Kendi örnek cümleni oluştur.' : `${lessonForm.title} konusunu yeni bir cümlede çalış (${i + 1}).` })), questions: [{ question: 'Bu konuyu kendi cümlenle doğru biçimde açıklayabiliyor musun?', options: ['Evet, açıklayabiliyorum.', 'Bir kez daha çalışmalıyım.'], answer: 0, why: 'Kendi cümleni kurmak öğrenmeyi pekiştirir.' }, { question: 'Konuyu tekrar etmek için en iyi yaklaşım hangisi?', options: ['Örnek üretmek', 'Hiç pratik yapmamak'], answer: 0, why: 'Aktif hatırlama ve üretim öğrenmeyi destekler.' }, { question: 'Cümle kurarken neye dikkat etmelisin?', options: ['Anlam ve bağlama', 'Sadece kelime uzunluğuna'], answer: 0, why: 'Dil yapısı bağlam içinde anlam kazanır.' }, { question: 'Ders sonunda ne yapmalısın?', options: ['Kısa tekrar yapmak', 'Konuyu tamamen unutmak'], answer: 0, why: 'Kısa tekrar bilgiyi pekiştirir.' }] });
  const addLesson = event => {
    event.preventDefault();
    if (editingLessonId) updateState(prev => ({ ...prev, customLessons: (prev.customLessons || []).map(item => item.id === editingLessonId ? lessonPayload(editingLessonId) : item) }));
    else { const id = `CUSTOM-${Date.now()}`; updateState(prev => ({ ...prev, customLessons: [...(prev.customLessons || []), lessonPayload(id)] })); }
    setLessonForm({ level: 'A1', moduleTitle: 'Özel dersler', title: '', focus: '', rule: '' }); setEditingLessonId(null); setNote('Ders kaydedildi.');
  };
  const editWord = item => { setWordForm({ level: item.level, word: item.word, meaning: item.meaning, type: item.type, pronunciation: item.pronunciation, example: item.example, translation: item.translation }); setEditingWordId(item.id); setAdminTab('word'); };
  const deleteWord = id => { if (confirm('Bu özel kelimeyi silmek istiyor musun?')) updateState(prev => ({ ...prev, customWords: prev.customWords.filter(item => item.id !== id) })); };
  const editLesson = item => { setLessonForm({ level: item.level, moduleTitle: item.moduleTitle, title: item.title, focus: item.focus, rule: item.rule }); setEditingLessonId(item.id); setAdminTab('lesson'); };
  const deleteLesson = id => { if (confirm('Bu özel dersi silmek istiyor musun?')) updateState(prev => ({ ...prev, customLessons: prev.customLessons.filter(item => item.id !== id), completedLessons: prev.completedLessons.filter(item => item !== id) })); };
  const importContent = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const payload = parsed.content || parsed;
      if (!Array.isArray(payload.customLessons || []) || !Array.isArray(payload.customWords || [])) throw new Error('JSON dosyasında customLessons ve customWords dizileri bulunmalı.');
      updateState(prev => ({ ...prev, customLessons: [...(prev.customLessons || []), ...(payload.customLessons || [])], customWords: [...(prev.customWords || []), ...(payload.customWords || [])] }));
      setNote('İçerikler içe aktarıldı.');
    } catch (error) { setNote(error.message || 'İçerik dosyası okunamadı.'); }
    event.target.value = '';
  };
  const changePin = () => { const next = prompt('Yeni yönetici PIN’ini gir (en az 4 karakter):'); if (next && next.trim().length >= 4) { updateState(prev => ({ ...prev, adminPin: next.trim() })); setNote('Yönetici PIN’i değiştirildi. Bu koruma yalnızca bu cihazdaki arayüz içindir.'); } else if (next !== null) setNote('PIN en az 4 karakter olmalı.'); };
  if (!unlocked) return <div className="page-content admin-lock-wrap"><div className="admin-lock panel"><div className="lock-illustration">⌘</div><div className="eyebrow">LOCAL CONTENT MANAGER</div><h2>Yönetici alanı</h2><p>İçerik düzenleme ekranı yalnızca bu cihazdaki yerel veriler üzerinde çalışır. Sunucu tabanlı güvenlik sağlamaz.</p><label>Yönetici PIN’i<input type="password" inputMode="numeric" value={pin} onChange={e => setPin(e.target.value)} placeholder="PIN gir" onKeyDown={e => e.key === 'Enter' && unlock()}/></label>{error && <div className="error-text">{error}</div>}<Button className="full" onClick={unlock}>Panele giriş yap →</Button><small>İlk kurulum PIN’i: 2468 · Ayarlardan değiştirilebilir.</small></div></div>;
  return <div className="page-content admin-page"><div className="admin-warning"><span>⚠</span><p><b>Yerel yönetim paneli:</b> Eklediğin içerikler sadece bu cihazda saklanır. PIN, gerçek sunucu yetkilendirmesi veya güvenli kullanıcı yönetimi yerine geçmez.</p></div><div className="admin-tabs">{[{ id: 'overview', label: 'Genel bakış' }, { id: 'word', label: 'Kelime ekle' }, { id: 'lesson', label: 'Ders ekle' }, { id: 'content', label: 'İçerikler' }].map(item => <button key={item.id} className={adminTab === item.id ? 'active' : ''} onClick={() => setAdminTab(item.id)}>{item.label}</button>)}</div>
    {adminTab === 'overview' && <div className="admin-stats-grid"><StatCard icon="▤" label="Ders içeriği" value={lessonCount + (state.customLessons?.length || 0)} meta="Standart + özel ders" tone="blue"/><StatCard icon="Aa" label="Kelime havuzu" value={baseWords.length + (state.customWords?.length || 0)} meta="Standart + özel kelime" tone="green"/><StatCard icon="✓" label="Soru bankası" value={lessons.length * 4} meta="Ders mini testleri" tone="purple"/><StatCard icon="⚙" label="Yönetici" value="Yerel" meta="Bu cihazda" tone="orange"/><section className="panel admin-tool-card"><h3>İçerik araçları</h3><p>Yedekleme, yönetici PIN’i ve seviye geçiş koşulunu buradan yönetebilirsin.</p><div className="settings-row"><div><b>Seviye geçişinde sınav şartı</b><small>{state.settings.requireLevelExam === false ? "Kapalı · Tüm dersler bitince sonraki seviye açılır." : "Açık · Tüm dersler ve en az %70 sınav başarısı gerekir."}</small></div><button className={`toggle ${state.settings.requireLevelExam !== false ? "on" : ""}`} onClick={() => updateState(prev => { const requireLevelExam = !prev.settings.requireLevelExam; const next = { ...prev, settings: { ...prev.settings, requireLevelExam } }; if (!requireLevelExam) { const allDone = lessons.filter(item => item.level === prev.currentLevel).every(item => prev.completedLessons.includes(item.id)); const nextIndex = levelOrder.indexOf(prev.currentLevel) + 1; if (allDone && nextIndex < levelOrder.length) next.currentLevel = levelOrder[nextIndex]; } return next; })} aria-label="Seviye geçişinde sınav şartı"><i/></button></div><div className="admin-actions"><Button variant="outline" onClick={() => exportState(state)}>Tüm verileri dışa aktar</Button><Button variant="soft" onClick={changePin}>PIN’i değiştir</Button></div></section></div>}
    {adminTab === 'word' && <form className="panel admin-form" onSubmit={addWord}><div className="eyebrow">KELİME BANKASI</div><h3>{editingWordId ? 'Kelimeyi düzenle' : 'Yeni kelime ekle'}</h3><div className="form-row three"><label>Seviye<select value={wordForm.level} onChange={e => setWordForm(p => ({ ...p, level: e.target.value }))}>{levelOrder.map(id => <option key={id}>{id}</option>)}</select></label><label>Kelime türü<select value={wordForm.type} onChange={e => setWordForm(p => ({ ...p, type: e.target.value }))}>{['noun','verb','adjective','adverb','phrasal verb','phrase'].map(id => <option key={id}>{id}</option>)}</select></label><label>Kelime<input required value={wordForm.word} onChange={e => setWordForm(p => ({ ...p, word: e.target.value }))}/></label></div><div className="form-row two"><label>Türkçe anlamı<input required value={wordForm.meaning} onChange={e => setWordForm(p => ({ ...p, meaning: e.target.value }))}/></label><label>IPA / telaffuz<input value={wordForm.pronunciation} onChange={e => setWordForm(p => ({ ...p, pronunciation: e.target.value }))} placeholder="/ˈwɜːd/"/></label></div><label>İngilizce örnek<input required value={wordForm.example} onChange={e => setWordForm(p => ({ ...p, example: e.target.value }))}/></label><label>Türkçe çeviri<input required value={wordForm.translation} onChange={e => setWordForm(p => ({ ...p, translation: e.target.value }))}/></label><Button type="submit">{editingWordId ? 'Değişiklikleri kaydet' : 'Kelimeyi kaydet'} <span>→</span></Button></form>}
    {adminTab === 'lesson' && <form className="panel admin-form" onSubmit={addLesson}><div className="eyebrow">MÜFREDAT YÖNETİMİ</div><h3>{editingLessonId ? 'Özel dersi düzenle' : 'Özel ders oluştur'}</h3><div className="form-row two"><label>Seviye<select value={lessonForm.level} onChange={e => setLessonForm(p => ({ ...p, level: e.target.value }))}>{levelOrder.map(id => <option key={id}>{id}</option>)}</select></label><label>Modül adı<input value={lessonForm.moduleTitle} onChange={e => setLessonForm(p => ({ ...p, moduleTitle: e.target.value }))} required/></label></div><label>Ders başlığı<input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} required/></label><label>Öğrenme hedefi / açıklama<textarea rows="3" value={lessonForm.focus} onChange={e => setLessonForm(p => ({ ...p, focus: e.target.value }))} required/></label><label>Konu kuralı<textarea rows="3" value={lessonForm.rule} onChange={e => setLessonForm(p => ({ ...p, rule: e.target.value }))} required/></label><div className="listening-note">Özel ders için örnek cümle alanları ve 4 temel değerlendirme sorusu otomatik oluşturulur. İçerikleri yayına almadan önce gözden geçirip düzenle. Standart müfredatın yerini almaz.</div><Button type="submit">{editingLessonId ? 'Değişiklikleri kaydet' : 'Dersi ekle'} <span>→</span></Button></form>}
    {adminTab === 'content' && <section className="panel admin-content-list"><div className="section-heading"><div><div className="eyebrow">ÖZEL İÇERİKLER</div><h3>Eklenen dersler ve kelimeler</h3></div><span className="panel-caption">{(state.customLessons?.length || 0) + (state.customWords?.length || 0)} öğe</span></div>{state.customLessons?.length ? state.customLessons.map(item => <div className="history-row" key={item.id}><div className="history-symbol">▤</div><div><b>{item.title}</b><small>{item.level} · {item.moduleTitle}</small></div><button className="edit-small" onClick={() => editLesson(item)}>Düzenle</button><button className="delete-small" onClick={() => deleteLesson(item.id)}>Sil</button></div>) : <div className="empty-state compact">Henüz özel ders eklenmedi.</div>}{state.customWords?.length ? <div className="admin-word-list">{state.customWords.map(word => <div key={word.id}><div><b>{word.word}</b><span>{word.meaning} · {word.level}</span></div><button className="edit-small" onClick={() => editWord(word)}>Düzenle</button><button className="delete-small" onClick={() => deleteWord(word.id)}>Sil</button></div>)}</div> : null}<div className="content-import"><Button variant="outline" onClick={() => fileRef.current?.click()}>JSON içerik içe aktar ↑</Button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={importContent}/><small>Dosyada customLessons ve customWords dizileri olmalı.</small></div></section>}
    {note && <div className="inline-message">{note}</div>}
  </div>;
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState(state.profile ? 'home' : 'welcome');
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [notice, setNotice] = useState('');
  const [examMode, setExamMode] = useState('level');
  const [examAnswers, setExamAnswers] = useState({});
  const [examSubmitted, setExamSubmitted] = useState(false);
  const activeLesson = useMemo(() => [...lessons, ...(state.customLessons || [])].find(item => item.id === activeLessonId), [activeLessonId, state.customLessons]);

  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme === 'system' ? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : state.settings.theme;
    document.documentElement.style.setProperty('--font-scale', String(state.settings.fontScale || 1));
  }, [state.settings.theme, state.settings.fontScale]);
  useEffect(() => { const handler = () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); }; window.addEventListener('pagehide', handler); return () => window.removeEventListener('pagehide', handler); }, []);

  const navigate = destination => { setPage(destination); setNotice(''); window.scrollTo?.({ top: 0, behavior: 'smooth' }); };
  const finishOnboarding = profile => { setState(prev => ({ ...prev, profile, currentLevel: profile.level || 'A1', settings: { ...prev.settings, dailyGoal: profile.goal || prev.settings.dailyGoal } })); navigate('home'); };
  const beginPlacementOnboarding = profile => { setState(prev => ({ ...prev, profile, settings: { ...prev.settings, dailyGoal: profile.goal || prev.settings.dailyGoal } })); navigate('placement'); };
  const openLesson = id => { setActiveLessonId(id); setPage('lesson'); setNotice(''); window.scrollTo?.(0, 0); };
  const update = updater => setState(updater);
  const completeLesson = (id, score) => {
    setState(prev => {
      if (prev.completedLessons.includes(id)) return prev;
      const completedLessons = [...prev.completedLessons, id];
      const next = updateStudy({ ...prev, completedLessons, lessonScores: { ...prev.lessonScores, [id]: score }, xp: (prev.xp || 0) + 20 }, 0, id);
      const currentLevelLessons = lessons.filter(item => item.level === next.currentLevel);
      if (next.settings.requireLevelExam === false && currentLevelLessons.every(item => completedLessons.includes(item.id))) {
        const nextIndex = levelOrder.indexOf(next.currentLevel) + 1;
        if (nextIndex < levelOrder.length) next.currentLevel = levelOrder[nextIndex];
      }
      return next;
    });
    setPage('course');
    setNotice(state.settings.requireLevelExam === false ? 'Ders tamamlandı. 20 XP kazandın!' : 'Ders tamamlandı. 20 XP kazandın! Seviye geçişi için tüm derslerden sonra seviye sınavını geç.');
    window.scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  const dailyPractice = () => { navigate('practice'); setNotice('Pratik alanı açıldı. Çalışma süren odaklanma sayacıyla kaydedilir.'); };
  const resetData = () => { if (confirm('Tüm öğrenme verilerini silmek istediğine emin misin? Bu işlem geri alınamaz.')) { const next = loadState(); next.profile = state.profile; setState(next); navigate('home'); } };
  const startPlacement = () => { setExamAnswers({}); setExamSubmitted(false); navigate('placement'); };
  const startExam = mode => { setExamMode(mode); setExamAnswers({}); setExamSubmitted(false); navigate('exam-run'); };
  const finishExam = (questions, title, level = null) => {
    const correct = questions.filter((item, index) => examAnswers[index] === item.answer).length;
    const result = { title, level: level || state.currentLevel, score: correct, total: questions.length, percent: Math.round(correct / questions.length * 100), date: new Date().toISOString() };
    const currentLevel = state.currentLevel;
    const allLessonsCompleted = lessons.filter(item => item.level === currentLevel).every(item => state.completedLessons.includes(item.id));
    setState(prev => {
      const next = { ...updateStudy(prev, 10), xp: prev.xp + Math.round(result.percent / 5), examHistory: [...(prev.examHistory || []), result] };
      const levelLessonsDone = lessons.filter(item => item.level === prev.currentLevel).every(item => prev.completedLessons.includes(item.id));
      if (examMode === 'level' && result.percent >= 70 && levelLessonsDone) {
        const nextIndex = levelOrder.indexOf(prev.currentLevel) + 1;
        if (nextIndex < levelOrder.length) next.currentLevel = levelOrder[nextIndex];
      }
      return next;
    });
    if (examMode === 'level') {
      if (result.percent < 70) setNotice('Seviye sınavı için en az %70 başarı gerekiyor. Tekrar deneyebilirsin.');
      else if (!allLessonsCompleted) setNotice('Sınavı geçtin! Seviyeyi tamamlamak için bu seviyedeki tüm 20 dersi de bitirmelisin.');
      else setNotice('Tebrikler! Seviye sınavını geçtin; sonraki seviyenin kilidi açıldı.');
    }
    setExamSubmitted(true);
  };
  const examQuestions = examMode === 'placement' ? placementQuestions : lessons.filter(item => item.level === state.currentLevel).filter((item, index) => index % 4 === 0).flatMap(item => item.questions);
  const handlePlacementFinish = (level, score) => { setState(prev => ({ ...prev, currentLevel: level, profile: { ...prev.profile, level }, examHistory: [...(prev.examHistory || []), { title: 'Seviye belirleme', level, score, total: placementQuestions.length, percent: Math.round(score / placementQuestions.length * 100), date: new Date().toISOString() }] })); navigate('home'); };

  if (page === 'welcome' || !state.profile) return <Onboarding onFinish={finishOnboarding} onPlacement={beginPlacementOnboarding}/>;
  return <div className="app-shell"><Sidebar page={page} navigate={navigate} profile={state.profile}/><div className="app-main"><Header state={state} page={page === 'exam-run' ? 'exams' : page} onNavigate={navigate}/>{notice && <button className="toast" onClick={() => setNotice('')}>{notice} <span>×</span></button>}
    {page === 'home' && <Dashboard state={state} onNavigate={navigate} onOpenLesson={openLesson} onDailyStudy={dailyPractice}/>}
    {page === 'course' && <CoursePage state={state} onOpenLesson={openLesson} onStartPlacement={startPlacement} onStartLevelExam={() => startExam('level')}/>}
    {page === 'lesson' && <LessonPage lesson={activeLesson} state={state} onBack={() => navigate('course')} onComplete={completeLesson} onDailyPractice={dailyPractice}/>}
    {page === 'words' && <WordsPage state={state} updateState={update}/>}
    {page === 'practice' && <PracticePage state={state} updateState={update}/>}
    {page === 'exams' && <ExamsPage state={state} onPlacement={startPlacement} onLevelExam={() => startExam('level')}/>}
    {page === 'placement' && <PlacementPage onBack={() => navigate('exams')} onFinish={handlePlacementFinish}/>}
    {page === 'exam-run' && <div className="page-content exam-run-page"><button className="back-link" onClick={() => navigate('exams')}>← Sınav merkezine dön</button><div className="panel exam-run-panel"><div className="eyebrow">{examMode === 'placement' ? 'PLACEMENT TEST' : `${state.currentLevel} LEVEL CHECK`}</div><h2>{examMode === 'placement' ? 'Seviye belirleme sınavı' : `${state.currentLevel} seviye değerlendirmesi`}</h2><p className="muted">Tüm soruları yanıtla ve sonucu görüntüle.</p>{!examSubmitted ? <><ProgressBar value={Object.keys(examAnswers).length / examQuestions.length * 100} thin/>{examQuestions.map((item, index) => <div className="question-card" key={index}><div className="question-no">Soru {index + 1} / {examQuestions.length}</div><h4>{item.question}</h4><div className="answer-options">{item.options.map((option, j) => <button className={`answer-option ${examAnswers[index] === j ? 'selected' : ''}`} key={j} onClick={() => setExamAnswers(prev => ({ ...prev, [index]: j }))}><span>{String.fromCharCode(65 + j)}</span>{option}</button>)}</div></div>)}<Button className="full" disabled={Object.keys(examAnswers).length !== examQuestions.length} onClick={() => finishExam(examQuestions, examMode === 'placement' ? 'Seviye belirleme' : `${state.currentLevel} seviye sınavı`)}>Sınavı bitir</Button></> : <div className="exam-finish"><div className="result-score success">{Math.round(examQuestions.filter((item, i) => examAnswers[i] === item.answer).length / examQuestions.length * 100)}%</div><h3>Sınav tamamlandı</h3><p>Sonucun sınav geçmişine kaydedildi. Doğru cevapları ve açıklamaları aşağıdan inceleyebilirsin.</p>{examQuestions.map((item, i) => <div className="review-answer" key={i}><b>{i + 1}. {item.question}</b><p className={examAnswers[i] === item.answer ? 'correct-text' : 'incorrect-text'}>{item.options[item.answer]} · {item.why}</p></div>)}<Button onClick={() => navigate('exams')}>Sınav merkezine dön</Button></div>}</div></div>}
    {page === 'stats' && <StatsPage state={state}/>}
    {page === 'settings' && <SettingsPage state={state} updateState={update} onReset={resetData}/>}
    {page === 'admin' && <AdminPage state={state} updateState={update}/>}
    <footer className="app-footer"><span>IRENGlish</span><span>Learn with intention. Grow with confidence.</span></footer>
  </div><BottomNav page={page} navigate={navigate}/></div>;
}
