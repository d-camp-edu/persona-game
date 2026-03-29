import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { Activity, Award, Calendar, CheckCircle, ChevronRight, Edit, Flame, HeartPulse, LogOut, Plus, Settings, ShieldAlert, Star, Trash2, User, Users, Pill, Image as ImageIcon, Upload, Download, Gift, Dices, AlertTriangle, FileText } from 'lucide-react';

// ==========================================
// 1. Firebase Initialization & Config
// ==========================================
// 🚨 파이어베이스 [일반] -> 맨 밑 [내 앱] 에서 찾은 코드를 아래에 덮어씌우세요! 🚨
// 미리보기 화면에서는 자동 연결되며, 깃허브 배포 시에는 아래 작성하신 코드로 작동합니다.
const firebaseConfig = {
  apiKey: "AIzaSyB475AzDr96EP6I7YsyZx3OjnYDMuMaq7k",
  authDomain: "diabetes-sales.firebaseapp.com",
  projectId: "diabetes-sales",
  storageBucket: "diabetes-sales.firebasestorage.app",
  messagingSenderId: "778615949732",
  appId: "1:778615949732:web:47f4022e3c955277cbd931"
};
// 🚨 ================================================ 🚨

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'persona-diabetes-game';

// ==========================================
// 2. Default Initial Data
// ==========================================
const DEFAULT_COMORBIDITIES = [
  { name: '심부전', goodMsg: '선생님! 숨차는 증상도 덜하고 심장 쪽도 편안해졌어요.', badMsg: '숨이 더 차고 가슴이 답답해요. 약이 안 맞는 것 같아요.' },
  { name: '만성신장질환(CKD)', goodMsg: '소변 거품도 줄고 붓기도 덜하네요! 감사합니다.', badMsg: '소변 보기가 불편하고 몸이 더 붓는 것 같아요.' },
  { name: '심혈관질환', goodMsg: '가슴 뻐근함이 줄고 컨디션이 좋습니다.', badMsg: '가슴이 두근거리고 혈압이 오르는 느낌이에요.' },
  { name: '비만', goodMsg: '살도 조금 빠지는 것 같고 몸이 가벼워졌어요!', badMsg: '약 먹고 나서 체중이 더 느는 것 같아요...' },
  { name: '고혈압', goodMsg: '혈압 수치도 안정적으로 잘 나옵니다.', badMsg: '뒷목이 뻐근하고 혈압이 오르는 것 같습니다.' },
  { name: '위장장애', goodMsg: '속 쓰림 없이 약이 아주 잘 받네요.', badMsg: '명치가 답답하고 소화가 하나도 안 돼요.' },
  { name: '골다공증', goodMsg: '관절이나 뼈에 무리 없이 약이 잘 맞습니다.', badMsg: '뼈마디가 시리고 쑤시는 부작용이 있는 것 같아요.' }
];

const DEFAULT_SETTINGS = {
  loginBgStart: '#6366f1',
  loginBgEnd: '#9333ea',
  loginBtnColor: '#6366f1',
  loginLogoUrl: '',
  maxPrescriptionOptions: 6,
  patientsPerDay: 2,
  allowMultipleDaysPerRealDay: true,
  dashboardBaseImg: '',
  encounterDoctorImg: '',
  backgroundImgUrl: '',
  comorbidities: DEFAULT_COMORBIDITIES
};

const DEFAULT_PATIENTS = [
  { id: 'p1', name: '김철수', age: 45, gender: 'M', weight: 82, bmi: 26.5, initialHba1c: 7.8, type: '초진', desc: '선생님, 최근 물을 많이 마시고 너무 피곤해요.', prevTreatment: '', adherence: '좋음', comorbidities: ['비만', '위장장애'], imageUrl: '', order: 1 },
  { id: 'p2', name: '이영희', age: 52, gender: 'F', weight: 65, bmi: 24.2, initialHba1c: 8.2, type: '재진', desc: '선생님, 약은 잘 먹는데 식단 조절이 안 되네요.', prevTreatment: '메트포르민 500mg 하루 2회', adherence: '좋음', comorbidities: ['고혈압'], imageUrl: '', order: 2 },
  { id: 'p3', name: '박지훈', age: 38, gender: 'M', weight: 92, bmi: 29.1, initialHba1c: 9.1, type: '초진', desc: '비만형 당뇨입니다. 요즘 가슴이 가끔 답답해요.', prevTreatment: '', adherence: '나쁨', comorbidities: ['비만', '심혈관질환'], imageUrl: '', order: 3 },
  { id: 'p4', name: '최수진', age: 60, gender: 'F', weight: 58, bmi: 22.1, initialHba1c: 7.2, type: '재진', desc: '소변에 거품이 많아지고 몸이 부어요.', prevTreatment: '메트포르민 1000mg', adherence: '좋음', comorbidities: ['만성신장질환(CKD)'], imageUrl: '', order: 4 },
  { id: 'p5', name: '정민수', age: 41, gender: 'M', weight: 95, bmi: 31.0, initialHba1c: 10.5, type: '초진', desc: '숨이 자꾸 차네요. 바빠서 약 먹기도 귀찮아요.', prevTreatment: '', adherence: '나쁨', comorbidities: ['비만', '심부전'], imageUrl: '', order: 5 },
  { id: 'p6', name: '강동원', age: 55, gender: 'M', weight: 70, bmi: 21.5, initialHba1c: 6.8, type: '리핏', desc: '타병원에서 전원왔습니다. 뼈가 약하다네요.', prevTreatment: 'DPP-4 억제제 단독 요법', adherence: '좋음', comorbidities: ['골다공증'], imageUrl: '', order: 6 },
  { id: 'p7', name: '윤보미', age: 48, gender: 'F', weight: 68, bmi: 25.0, initialHba1c: 8.5, type: '재진', desc: '소화가 너무 안돼요. 혈당은 널뛰기하구요.', prevTreatment: '메트포르민 500mg, 피오글리타존 15mg', adherence: '좋음', comorbidities: ['위장장애'], imageUrl: '', order: 7 },
  { id: 'p8', name: '임요환', age: 65, gender: 'M', weight: 62, bmi: 20.8, initialHba1c: 7.9, type: '리핏', desc: '혈압도 높고 신장도 안 좋다고 하네요.', prevTreatment: '인슐린 글라진 15U, 트라젠타', adherence: '좋음', comorbidities: ['고혈압', '만성신장질환(CKD)'], imageUrl: '', order: 8 },
  { id: 'p9', name: '한소희', age: 35, gender: 'F', weight: 55, bmi: 21.5, initialHba1c: 8.0, type: '초진', desc: '임신성 당뇨가 있었는데 다시 안 좋아진 것 같아요.', prevTreatment: '', adherence: '좋음', comorbidities: [], imageUrl: '', order: 9 },
  { id: 'p10', name: '송중기', age: 50, gender: 'M', weight: 72, bmi: 23.8, initialHba1c: 9.5, type: '재진', desc: '바빠서 그런지 약 챙겨 먹는 걸 자주 잊어버립니다.', prevTreatment: '메트포르민 1000mg', adherence: '나쁨', comorbidities: [], imageUrl: '', order: 10 },
  { id: 'p11', name: '아이유', age: 32, gender: 'F', weight: 48, bmi: 18.5, initialHba1c: 7.5, type: '초진', desc: '스트레스를 많이 받아서 그런지 속이 쓰리네요.', prevTreatment: '', adherence: '좋음', comorbidities: ['위장장애'], imageUrl: '', order: 11 },
  { id: 'p12', name: '유재석', age: 51, gender: 'M', weight: 68, bmi: 22.5, initialHba1c: 7.1, type: '재진', desc: '운동을 병행하고 있는데 조금씩 좋아지는 것 같아요.', prevTreatment: '메트포르민 500mg', adherence: '좋음', comorbidities: [], imageUrl: '', order: 12 },
  { id: 'p13', name: '이광수', age: 39, gender: 'M', weight: 75, bmi: 21.0, initialHba1c: 11.2, type: '리핏', desc: '물도 많이 먹고 소변도 잦고... 살이 계속 쪄요.', prevTreatment: '다회 인슐린 주사 요법', adherence: '나쁨', comorbidities: ['비만'], imageUrl: '', order: 13 },
  { id: 'p14', name: '전지현', age: 42, gender: 'F', weight: 52, bmi: 19.8, initialHba1c: 8.8, type: '재진', desc: '인슐린 주사는 정말 맞기 싫은데... 다른 방법 없을까요?', prevTreatment: '메트포르민 1000mg, SU제제', adherence: '나쁨', comorbidities: [], imageUrl: '', order: 14 },
  { id: 'p15', name: '공유', age: 44, gender: 'M', weight: 80, bmi: 24.5, initialHba1c: 6.9, type: '리핏', desc: '합병증이 올까 봐 너무 무섭습니다. 심장 관리도 하고 싶어요.', prevTreatment: 'SGLT2 억제제, 메트포르민', adherence: '좋음', comorbidities: ['심혈관질환'], imageUrl: '', order: 15 },
  { id: 'p16', name: '수지', age: 29, gender: 'F', weight: 50, bmi: 19.0, initialHba1c: 8.4, type: '초진', desc: '마른 편인데도 당뇨라니... 소화도 잘 안돼요.', prevTreatment: '', adherence: '좋음', comorbidities: ['위장장애'], imageUrl: '', order: 16 },
  { id: 'p17', name: '현빈', age: 41, gender: 'M', weight: 76, bmi: 23.5, initialHba1c: 9.8, type: '재진', desc: '회식이 너무 잦아서 식단 관리할 엄두가 안 납니다. 혈압도 높아요.', prevTreatment: 'DPP4 억제제 단독', adherence: '나쁨', comorbidities: ['고혈압', '비만'], imageUrl: '', order: 17 },
  { id: 'p18', name: '김태희', age: 43, gender: 'F', weight: 54, bmi: 20.5, initialHba1c: 7.6, type: '초진', desc: '부모님 두 분 다 당뇨셔서 걱정했는데 결국 저도 왔네요.', prevTreatment: '', adherence: '좋음', comorbidities: [], imageUrl: '', order: 18 },
  { id: 'p19', name: '박보검', age: 30, gender: 'M', weight: 70, bmi: 22.0, initialHba1c: 8.1, type: '리핏', desc: '제 상태에 대해 좀 더 자세히 설명해 주실 수 있나요? 걱정이 많습니다.', prevTreatment: '메트포르민 500mg', adherence: '좋음', comorbidities: [], imageUrl: '', order: 19 },
  { id: 'p20', name: '손예진', age: 40, gender: 'F', weight: 49, bmi: 19.5, initialHba1c: 10.0, type: '재진', desc: '이 약 저 약 다 먹어봤는데 소용이 없어요. 신장 수치도 안 좋다네요.', prevTreatment: '메트포르민, DPP4, SGLT2 3제 요법', adherence: '좋음', comorbidities: ['만성신장질환(CKD)', '심혈관질환'], imageUrl: '', order: 20 },
];

const DEFAULT_DRUG_CLASSES = [
  { id: 'dc_met', name: 'Biguanide (메트포르민)', allowDuplicate: false },
  { id: 'dc_dpp4', name: 'DPP-4 억제제', allowDuplicate: false },
  { id: 'dc_sglt2', name: 'SGLT2 억제제', allowDuplicate: false },
  { id: 'dc_su', name: '설폰요소제(SU)', allowDuplicate: false },
  { id: 'dc_tzd', name: 'TZD', allowDuplicate: false },
  { id: 'dc_glp1', name: 'GLP-1 RA', allowDuplicate: false },
  { id: 'dc_ins', name: '인슐린', allowDuplicate: true }, 
];

const DEFAULT_DEDUCTION_RULES = [
  { id: 'dr_1', classes: ['dc_dpp4', 'dc_glp1'] }, 
];

const DEFAULT_MEDICATIONS = [
  // 초진 6종
  { id: 'm_c1', type: '초진', name: '메트포르민 500mg', desc: '1차 선택약제', effect: 1.0, isPackaging: false, sideEffectProb: 15, sideEffectMsg: '가벼운 위장장애 발생', classes: ['dc_met'], beneficialComorb: [], worseningComorb: ['위장장애'] },
  { id: 'm_c2', type: '초진', name: 'DPP-4 억제제', desc: '식후 혈당 조절, 부작용 적음', effect: 0.8, isPackaging: false, sideEffectProb: 5, sideEffectMsg: '두통 발생', classes: ['dc_dpp4'], beneficialComorb: [], worseningComorb: [] },
  { id: 'm_c3', type: '초진', name: 'SGLT2 억제제', desc: '체중 감소 및 심신 보호', effect: 0.9, isPackaging: false, sideEffectProb: 10, sideEffectMsg: '비뇨기계 감염 증상', classes: ['dc_sglt2'], beneficialComorb: ['심부전', '만성신장질환(CKD)', '비만'], worseningComorb: [] },
  { id: 'm_c4', type: '초진', name: '설폰요소제(SU)', desc: '강력한 인슐린 분비 촉진', effect: 1.2, isPackaging: false, sideEffectProb: 20, sideEffectMsg: '저혈당 쇼크 주의', classes: ['dc_su'], beneficialComorb: [], worseningComorb: ['비만'] },
  { id: 'm_c5', type: '초진', name: 'TZD 제제', desc: '인슐린 저항성 개선', effect: 1.0, isPackaging: false, sideEffectProb: 15, sideEffectMsg: '체중 증가 및 부종', classes: ['dc_tzd'], beneficialComorb: [], worseningComorb: ['심부전', '골다공증'] },
  { id: 'm_c6', type: '초진', name: '생활습관 교정 단독', desc: '초기 경증 환자용 교육', effect: 0.3, isPackaging: false, sideEffectProb: 0, sideEffectMsg: '', classes: [], beneficialComorb: [], worseningComorb: [] },
  // 재진 6종
  { id: 'm_j1', type: '재진', name: '가브스메트 (복합제)', desc: 'DPP4 + 메트포르민', effect: 1.5, isPackaging: false, sideEffectProb: 5, sideEffectMsg: '소화 불량', classes: ['dc_met', 'dc_dpp4'], beneficialComorb: [], worseningComorb: ['위장장애'] },
  { id: 'm_j2', type: '재진', name: 'SGLT2 추가', desc: '심장/신장 혜택', effect: 0.9, isPackaging: false, sideEffectProb: 10, sideEffectMsg: '다뇨 증상 호소', classes: ['dc_sglt2'], beneficialComorb: ['심부전', '만성신장질환(CKD)'], worseningComorb: [] },
  { id: 'm_j3', type: '재진', name: '기저 인슐린 시작', desc: '경구약 실패시', effect: 1.5, isPackaging: false, sideEffectProb: 15, sideEffectMsg: '주사 부위 발적', classes: ['dc_ins'], beneficialComorb: [], worseningComorb: ['비만'] },
  { id: 'm_j4', type: '재진', name: 'SU제제 증량', desc: '빠른 혈당 강하 필요시', effect: 1.0, isPackaging: false, sideEffectProb: 20, sideEffectMsg: '체중 증가', classes: ['dc_su'], beneficialComorb: [], worseningComorb: ['비만'] },
  { id: 'm_j5', type: '재진', name: 'TZD 추가', desc: '지방간 동반시', effect: 1.0, isPackaging: false, sideEffectProb: 10, sideEffectMsg: '부종 발생', classes: ['dc_tzd'], beneficialComorb: [], worseningComorb: ['심부전'] },
  { id: 'm_j6', type: '재진', name: 'GLP-1 주사 (병포장)', desc: '체중 감소 및 순응도 개선', effect: 1.4, isPackaging: true, sideEffectProb: 25, sideEffectMsg: '심한 오심과 구토', classes: ['dc_glp1'], beneficialComorb: ['비만', '심혈관질환'], worseningComorb: ['위장장애'] },
  // 리핏 6종
  { id: 'm_r1', type: '리핏', name: '동일 처방 유지', desc: '이전 병원 처방 유지', effect: 0.2, isPackaging: false, sideEffectProb: 5, sideEffectMsg: '약효 내성', classes: [], beneficialComorb: [], worseningComorb: [] },
  { id: 'm_r2', type: '리핏', name: 'SGLT2로 교체', desc: '심부전 동반 환자용', effect: 0.8, isPackaging: false, sideEffectProb: 10, sideEffectMsg: '수분 부족 탈수', classes: ['dc_sglt2'], beneficialComorb: ['심부전'], worseningComorb: [] },
  { id: 'm_r3', type: '리핏', name: '복합제 변경(병포장)', desc: '복약 순응도 강제 개선', effect: 0.8, isPackaging: true, sideEffectProb: 10, sideEffectMsg: '복합제 알러지', classes: ['dc_met', 'dc_dpp4'], beneficialComorb: [], worseningComorb: [] },
  { id: 'm_r4', type: '리핏', name: '다회 인슐린 요법', desc: '집중 혈당 관리', effect: 2.0, isPackaging: false, sideEffectProb: 25, sideEffectMsg: '심각한 저혈당 위험', classes: ['dc_ins'], beneficialComorb: [], worseningComorb: ['비만'] },
  { id: 'm_r5', type: '리핏', name: 'DPP4 + SGLT2 병용', desc: '강력한 경구 혈당강하', effect: 1.6, isPackaging: false, sideEffectProb: 10, sideEffectMsg: '피로감 증가', classes: ['dc_dpp4', 'dc_sglt2'], beneficialComorb: ['만성신장질환(CKD)'], worseningComorb: [] },
  { id: 'm_r6', type: '리핏', name: 'GLP-1 + 기저 인슐린', desc: '초강력 복합 주사 요법', effect: 1.8, isPackaging: false, sideEffectProb: 30, sideEffectMsg: '소화불량 및 오심 극심', classes: ['dc_glp1', 'dc_ins'], beneficialComorb: ['심혈관질환'], worseningComorb: ['위장장애'] },
];

const DEFAULT_PRIZES = [
  { id: 'pz1', name: '스타벅스 기프티콘', probability: 5 },
  { id: 'pz2', name: '비타민 드링크', probability: 20 },
  { id: 'pz3', name: '꽝 (다음 기회에)', probability: 75 }
];

const ROULETTE_COLORS = ['#FF6B6B', '#4ECDC4', '#FDCB6E', '#6C5CE7', '#A8E6CF', '#FD79A8', '#45B7D1', '#E17055'];

const processImageFile = (file, callback, maxWidth = 200) => {
  if (!file) return;
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = (e) => {
    const img = new Image();
    img.src = e.target.result;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let scaleSize = 1;
      if (img.width > maxWidth) scaleSize = maxWidth / img.width;
      canvas.width = img.width * scaleSize;
      canvas.height = img.height * scaleSize;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/png', 0.8));
    }
  }
};

const getDashboardProfileImage = (streak, settings) => {
  if (!settings) return null;
  if (streak >= 20 && settings.img20) return settings.img20;
  if (streak >= 15 && settings.img15) return settings.img15;
  if (streak >= 10 && settings.img10) return settings.img10;
  if (streak >= 5 && settings.img5) return settings.img5;
  if (streak >= 3 && settings.img3) return settings.img3;
  return settings.dashboardBaseImg || null; 
};

// ==========================================
// 3. Main Application Component
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [patients, setPatients] = useState([]);
  const [medications, setMedications] = useState([]);
  const [drugClasses, setDrugClasses] = useState([]);
  const [deductionRules, setDeductionRules] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [allGameStates, setAllGameStates] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(DEFAULT_SETTINGS);
  
  const [currentEmpId, setCurrentEmpId] = useState('');
  const [view, setView] = useState('login'); 
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const comorbidityList = useMemo(() => {
    const list = globalSettings?.comorbidities || DEFAULT_COMORBIDITIES;
    return list.map(c => typeof c === 'string' ? { name: c, goodMsg: '컨디션이 눈에 띄게 좋아졌습니다!', badMsg: '컨디션이 더 나빠진 것 같습니다...' } : c);
  }, [globalSettings?.comorbidities]);

  useEffect(() => {
    const link = document.createElement('link'); link.href = 'https://cdn.jsdelivr.net/gh/neodgm/neodgm-webfont@latest/neodgm/style.css'; link.rel = 'stylesheet'; document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth error:", err); }
    };
    initAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const setupCollection = (path, stateSetter, defaults = []) => {
      return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', path), (snap) => {
        let fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (fetched.length === 0 && defaults.length > 0) {
          defaults.forEach(async (d) => await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', path), d.id), d));
        } else {
          if (path === 'patients') fetched.sort((a, b) => a.order - b.order);
          stateSetter(fetched);
        }
      }, (err) => console.error(err));
    };

    const unsubP = setupCollection('patients', setPatients, DEFAULT_PATIENTS);
    const unsubM = setupCollection('medications', setMedications, DEFAULT_MEDICATIONS);
    const unsubDC = setupCollection('drugClasses', setDrugClasses, DEFAULT_DRUG_CLASSES);
    const unsubDR = setupCollection('deductionRules', setDeductionRules, DEFAULT_DEDUCTION_RULES);
    const unsubPz = setupCollection('prizes', setPrizes, DEFAULT_PRIZES);
    const unsubGs = setupCollection('gamestates', setAllGameStates);

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) setGlobalSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() });
    }, (err) => console.error(err));

    return () => { unsubP(); unsubM(); unsubDC(); unsubDR(); unsubPz(); unsubGs(); unsubSettings(); };
  }, [user]);

  const myState = useMemo(() => allGameStates.find(s => s.empId === currentEmpId) || null, [allGameStates, currentEmpId]);
  const currentPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleLogin = async (empId) => {
    if (!empId.trim()) return;
    setCurrentEmpId(empId);
    if (!allGameStates.find(s => s.empId === empId)) {
      await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'gamestates')), { empId, day: 1, score: 0, streak: 1, logs: [], prizeLogs: [], completedToday: [] });
    }
    setView('dashboard');
  };

  const handleLogout = () => { setCurrentEmpId(''); setView('login'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-indigo-50 text-indigo-700 font-bold">로딩 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-indigo-200">
      {view === 'login' && <LoginScreen onLogin={handleLogin} onAdminAccess={() => setView('admin')} settings={globalSettings} />}
      {view === 'admin' && <AdminScreen patients={patients} medications={medications} drugClasses={drugClasses} deductionRules={deductionRules} prizes={prizes} allGameStates={allGameStates} globalSettings={globalSettings} comorbidityList={comorbidityList} onLogout={handleLogout} />}
      {view === 'dashboard' && myState && (
        <DashboardScreen state={myState} patients={patients} prizes={prizes} drugClasses={drugClasses} deductionRules={deductionRules} globalSettings={globalSettings} onStartEncounter={(pId) => { setSelectedPatientId(pId); setView('encounter'); }} onLogout={handleLogout} />
      )}
      {view === 'encounter' && myState && currentPatient && (
        <EncounterScreen state={myState} patient={currentPatient} medications={medications} globalSettings={globalSettings} comorbidityList={comorbidityList} onComplete={() => { setSelectedPatientId(null); setView('dashboard'); }} />
      )}
    </div>
  );
}

// ==========================================
// Login Screen
// ==========================================
function LoginScreen({ onLogin, onAdminAccess, settings }) {
  const [input, setInput] = useState('');
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    if (adminPwd === '1024') onAdminAccess(); else setErrorMsg('비밀번호가 틀렸습니다.');
  };

  const safeBgStart = settings?.loginBgStart || '#6366f1';
  const safeBgEnd = settings?.loginBgEnd || '#9333ea';
  const safeBtnColor = settings?.loginBtnColor || '#6366f1';

  const bgStyle = { background: `linear-gradient(to bottom right, ${safeBgStart}, ${safeBgEnd})` };
  const btnStyle = { backgroundColor: safeBtnColor, borderColor: safeBtnColor };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative" style={bgStyle}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center transform transition-all hover:scale-105 duration-300 relative z-10">
        <div className="flex justify-center mb-6">
          {settings?.loginLogoUrl ? (
            <img src={settings.loginLogoUrl} className="h-24 object-contain drop-shadow-md animate-bounce" style={{animationDuration: '3s'}} />
          ) : (
            <div className="bg-indigo-100 p-4 rounded-full border-4 border-indigo-200">
              <HeartPulse size={48} className="text-indigo-600 animate-pulse" />
            </div>
          )}
        </div>
        <h1 className="text-4xl font-black text-gray-800 mb-2 tracking-tight">Persona</h1>
        <p className="text-gray-500 mb-8 font-medium">당뇨 마스터 20일 시뮬레이션</p>
        
        <input 
          type="text" placeholder="사번을 입력하세요" 
          className="w-full px-4 py-4 rounded-2xl bg-gray-100 border-2 border-transparent focus:border-indigo-400 focus:bg-white focus:outline-none transition-all text-center font-bold text-lg mb-4"
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onLogin(input)}
        />
        <button onClick={() => onLogin(input)} style={btnStyle} className="w-full text-white font-bold py-4 rounded-2xl border-b-4 hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all text-lg flex items-center justify-center gap-2">
          진료 시작하기 <ChevronRight size={24} />
        </button>
      </div>
      <button onClick={() => setShowAdminPrompt(true)} className="absolute bottom-6 right-6 p-3 text-white/50 hover:text-white hover:bg-white/20 rounded-full transition-all"><Settings size={24} /></button>

      {showAdminPrompt && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80 text-center animate-fade-in-up">
            <h2 className="text-xl font-bold mb-4 flex justify-center items-center gap-2"><ShieldAlert className="text-red-500"/> 관리자 콘솔</h2>
            <form onSubmit={handleAdminSubmit}>
              <input type="password" placeholder="비밀번호" className="w-full px-4 py-3 rounded-xl bg-gray-100 border-2 focus:border-red-400 focus:outline-none mb-2 text-center text-lg tracking-widest" value={adminPwd} onChange={(e) => { setAdminPwd(e.target.value); setErrorMsg(''); }} autoFocus />
              {errorMsg && <p className="text-red-500 text-sm font-bold mb-4">{errorMsg}</p>}
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => { setShowAdminPrompt(false); setAdminPwd(''); setErrorMsg(''); }} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300">취소</button>
                <button type="submit" className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600">접속</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Dashboard Screen
// ==========================================
function DashboardScreen({ state, patients, prizes, drugClasses, deductionRules, globalSettings, onStartEncounter, onLogout }) {
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [deductions, setDeductions] = useState([]);

  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteState, setRouletteState] = useState('idle'); 
  const [wonPrize, setWonPrize] = useState(null);
  const [rotation, setRotation] = useState(0);

  const isLockedOut = globalSettings?.allowMultipleDaysPerRealDay === false && state?.lastCompletedDate === new Date().toDateString();

  const todaysPatients = useMemo(() => {
    if (!patients || patients.length === 0) return [];
    const ppd = Number(globalSettings?.patientsPerDay) || 2;
    const startIndex = ((Number(state?.day || 1) - 1) * ppd) % patients.length;
    const list = [];
    for (let i = 0; i < ppd; i++) {
      const p = patients[(startIndex + i) % patients.length];
      if (p && !list.find(existing => existing.id === p.id)) list.push(p);
    }
    return list;
  }, [patients, state?.day, globalSettings?.patientsPerDay]);

  const completedList = state?.completedToday || [];
  const remainingToday = todaysPatients.filter(p => p && !completedList.includes(p.id));
  const progressPercent = todaysPatients.length > 0 ? ((todaysPatients.length - remainingToday.length) / todaysPatients.length) * 100 : 0;
  
  const profileImg = getDashboardProfileImage(state?.streak || 0, globalSettings);

  const evaluateDeductions = () => {
    const todaysLogs = (state.logs || []).filter(l => l.day === state.day);
    const msgs = [];
    todaysLogs.forEach(log => {
      const classes = log.drugClasses || [];
      const counts = {};
      classes.forEach(c => { counts[c] = (counts[c] || 0) + 1; });
      Object.keys(counts).forEach(cId => {
        if (counts[cId] > 1) {
          const cObj = drugClasses.find(d => d.id === cId);
          if (cObj && !cObj.allowDuplicate) msgs.push(`[${log.patientName}] ${cObj.name} 계열 중복 처방!`);
        }
      });
      deductionRules.forEach(rule => {
        const req = rule.classes || [];
        if (req.length > 1 && req.every(rc => classes.includes(rc))) {
           const names = req.map(rc => drugClasses.find(d => d.id === rc)?.name || '알수없음').join(' + ');
           msgs.push(`[${log.patientName}] 금기 조합 처방 (${names})!`);
        }
      });
    });
    setDeductions(msgs);
    setShowSummary(true);
  };

  const segments = useMemo(() => {
    if (!prizes || prizes.length === 0) return [];
    const total = prizes.reduce((sum, p) => sum + (Number(p.probability) || 0), 0) || 1;
    let curr = 0;
    return prizes.map((p, i) => {
      const span = ((Number(p.probability) || 0) / total) * 360;
      const start = curr; const end = curr + span; curr = end;
      return { ...p, start, end, color: ROULETTE_COLORS[i % ROULETTE_COLORS.length] };
    });
  }, [prizes]);
  
  const wheelGradient = useMemo(() => segments.map(s => `${s.color} ${s.start}deg ${s.end}deg`).join(', '), [segments]);

  const startRoulette = () => { setShowSummary(false); setShowRoulette(true); setRouletteState('idle'); setRotation(0); setWonPrize(null); };

  const executeSpin = () => {
    if (rouletteState !== 'idle') return;
    if (!prizes || prizes.length === 0) {
      setWonPrize({ name: '등록된 경품이 없습니다.' });
      setRouletteState('result');
      return;
    }

    setRouletteState('spinning');
    const totalProb = prizes.reduce((acc, p) => acc + (Number(p.probability) || 0), 0) || 1;
    const rand = Math.random() * totalProb;
    let cumulative = 0; let winnerIdx = 0;
    for (let i = 0; i < prizes.length; i++) {
      cumulative += (Number(prizes[i].probability) || 0);
      if (rand <= cumulative) { winnerIdx = i; break; }
    }
    const winner = prizes[winnerIdx]; 
    const winnerSeg = segments[winnerIdx];
    const margin = (winnerSeg.end - winnerSeg.start) * 0.05; 
    const randomAngleWithin = winnerSeg.start + margin + Math.random() * (winnerSeg.end - winnerSeg.start - 2*margin);
    const targetRotation = (5 * 360) + (360 - randomAngleWithin);
    setRotation(targetRotation);
    setTimeout(() => { setWonPrize(winner); setRouletteState('result'); }, 4000); 
  };

  const handleFinishDayAndSave = async (skipPrize = false) => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', state.id);
      const updates = { 
        day: Number(state.day) + 1, 
        completedToday: [], 
        streak: Number(state.streak) + 1,
        lastCompletedDate: new Date().toDateString()
      };
      if (!skipPrize && wonPrize && !wonPrize.name.includes('꽝') && wonPrize.name !== '등록된 경품이 없습니다.') {
        const newPrizeLog = { id: Date.now().toString(), day: state.day, prizeName: wonPrize.name, timestamp: new Date().toISOString() };
        updates.prizeLogs = [...(state.prizeLogs || []), newPrizeLog];
      }
      await updateDoc(docRef, updates);
    } catch(e) { console.error(e); }
    setShowSummary(false); setShowRoulette(false);
  };

  const handleCancelPrescription = async (patientId) => {
    const logToDelete = (state.logs || []).find(l => l.patientId === patientId && l.day === state.day);
    if (!logToDelete) return;
    setConfirmConfig({
      message: '정말 이 처방 기록을 삭제하시겠습니까?\n(삭제 후 재처방 가능)',
      onConfirm: async () => {
        try {
          const newLogs = state.logs.filter(l => l.id !== logToDelete.id);
          const newCompleted = state.completedToday.filter(id => id !== patientId);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', state.id), { logs: newLogs, completedToday: newCompleted, score: Math.max(0, Number(state.score) - 10) });
        } catch(e) { console.error(e); }
        setConfirmConfig(null);
      }
    });
  };

  const getBadgeColor = (type) => {
    if (type === '초진') return 'bg-blue-100 text-blue-700 border-blue-200';
    if (type === '재진') return 'bg-purple-100 text-purple-700 border-purple-200';
    if (type === '리핏') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-lg overflow-hidden flex flex-col relative">
      <div className="p-4 flex justify-between items-center border-b bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-orange-500 font-bold bg-orange-50 px-3 py-1 rounded-full border-2 border-orange-200">
            <Flame size={18} fill="currentColor" /> {state.streak}
          </div>
          <div className="flex items-center gap-1 text-blue-500 font-bold bg-blue-50 px-3 py-1 rounded-full border-2 border-blue-200">
            <Star size={18} fill="currentColor" /> {state.score}
          </div>
        </div>
        <button onClick={onLogout} className="text-gray-400 hover:text-gray-600 p-2"><LogOut size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 pb-24">
        <div className="flex items-end gap-4 mb-8">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center border-4 border-indigo-400 shadow-sm shrink-0 relative overflow-hidden">
            {profileImg ? <img src={profileImg} className="w-full h-full object-cover" /> : <User size={40} className="text-indigo-600" />}
            <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 border-2 border-white"><Award size={16} className="text-white" /></div>
          </div>
          <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border-2 border-gray-200 relative">
            <p className="font-bold text-gray-800 text-lg">사번 <span className="text-indigo-500">{state.empId}</span> 원장님!<br/>오늘은 <span className="text-blue-500">{state.day}일차</span> 진료입니다.</p>
            {isLockedOut ? (
              <p className="text-sm text-gray-500 mt-1">오늘 할당된 진료를 모두 완수하셨습니다!</p>
            ) : progressPercent === 100 ? (
              <p className="text-sm text-gray-500 mt-1">오늘의 모든 환자를 완벽하게 케어하셨어요! 🎉</p>
            ) : (
              <p className="text-sm text-gray-500 mt-1">대기 중인 환자들을 만나보세요. 파이팅!</p>
            )}
          </div>
        </div>

        {!isLockedOut && (
          <>
            <div className="mb-8">
              <div className="flex justify-between text-sm font-bold text-gray-500 mb-2">
                <span>오늘의 진료 진행도</span><span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-extrabold text-xl text-gray-800 flex items-center gap-2"><Users size={24} className="text-gray-400" /> 대기 환자 목록</h2>
              {todaysPatients.map((p, idx) => {
                const isCompleted = completedList.includes(p.id);
                return (
                  <div key={`${p.id}_${idx}`} className={`relative p-5 rounded-2xl border-2 transition-all ${isCompleted ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-gray-200 shadow-sm hover:border-indigo-400 hover:shadow-md cursor-pointer active:scale-[0.98]'}`} onClick={() => !isCompleted && onStartEncounter(p.id)}>
                    {isCompleted && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
                        <CheckCircle size={32} className="text-indigo-500" />
                        <button onClick={(e) => { e.stopPropagation(); handleCancelPrescription(p.id); }} className="text-[11px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200 shadow-sm z-20">
                          기록 삭제
                        </button>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2 pr-16 relative z-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">{p?.name}</span>
                        <span className="text-xs font-bold px-2 py-1 rounded bg-gray-100 text-gray-600">{p?.gender}/{p?.age}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${getBadgeColor(p?.type)}`}>{p?.type}</span>
                        {(p?.comorbidities || []).map(c => <span key={c} className="text-[10px] bg-red-50 text-red-600 px-1 border border-red-200 rounded">{c}</span>)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2 line-clamp-2 pr-12 relative z-0">{p?.desc}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {isLockedOut && (
          <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border-2 border-dashed border-gray-300 mt-4 text-center">
             <Calendar size={48} className="text-indigo-300 mb-4" />
             <h3 className="font-bold text-lg text-gray-800">오늘의 진료 완료</h3>
             <p className="text-sm text-gray-500 mt-2">원장님, 고생하셨습니다!<br/>내일 다시 출근하여 다음 일차 진료를 시작해주세요.</p>
          </div>
        )}
      </div>

      {progressPercent === 100 && !isLockedOut && (
        <div className="p-4 bg-white border-t border-gray-200 sticky bottom-0 z-10 animate-fade-in-up shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
           <button onClick={evaluateDeductions} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl border-b-4 border-blue-800 hover:border-blue-700 active:border-b-0 active:translate-y-1 transition-all text-lg flex items-center justify-center gap-2">
             <FileText size={24} /> 일일 결산 및 퇴근하기
           </button>
        </div>
      )}

      {/* Summary Modal (Deduction Check) */}
      {showSummary && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm px-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col animate-zoom-in">
             <h2 className="text-2xl font-black text-gray-800 mb-4 flex items-center gap-2 border-b pb-2"><Activity className="text-indigo-600"/> 일일 진료 결산</h2>
             <div className="flex-1 overflow-y-auto max-h-[300px] mb-6 custom-scrollbar pr-2">
               {deductions.length > 0 ? (
                 <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                   <div className="flex items-center gap-2 text-red-600 font-bold mb-3"><AlertTriangle size={20}/> 앗! 보험 삭감 사유가 발생했습니다!</div>
                   <ul className="list-disc pl-5 text-sm text-red-800 space-y-1">
                     {deductions.map((msg, i) => <li key={i}>{msg}</li>)}
                   </ul>
                   <p className="mt-4 text-xs text-red-500 font-bold">※ 삭감이 발생한 날은 룰렛을 돌릴 수 없습니다.</p>
                 </div>
               ) : (
                 <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex flex-col items-center text-center">
                   <CheckCircle size={40} className="text-green-500 mb-2"/>
                   <span className="font-bold text-green-800 text-lg">완벽한 진료입니다!</span>
                   <p className="text-sm text-green-600 mt-2">보험 삭감 요소가 없습니다.<br/>보상 룰렛을 돌릴 수 있습니다!</p>
                 </div>
               )}
             </div>
             {deductions.length > 0 ? (
               <div className="flex gap-2">
                 <button onClick={() => setShowSummary(false)} className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300">다시 진료하기</button>
                 <button onClick={() => handleFinishDayAndSave(true)} className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600">그냥 퇴근하기</button>
               </div>
             ) : (
               <button onClick={startRoulette} className="w-full bg-yellow-500 text-white font-bold py-4 rounded-xl border-b-4 border-yellow-600 hover:bg-yellow-400 active:border-b-0 active:translate-y-1 text-lg transition-all flex items-center justify-center gap-2">
                 <Gift size={20}/> 보상 룰렛 돌리기!
               </button>
             )}
          </div>
        </div>
      )}

      {/* Visual Roulette Modal */}
      {showRoulette && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm px-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-[360px] text-center flex flex-col items-center animate-zoom-in">
            <h2 className="text-2xl font-black text-gray-800 mb-1">보상 룰렛 타임!</h2>
            <p className="text-gray-500 mb-6 font-medium text-sm">오늘의 진료를 무사히 마쳤습니다!</p>
            
            <div className="relative w-56 h-56 md:w-64 md:h-64 mx-auto mb-6">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-transparent border-t-red-600 z-20 drop-shadow-md"></div>
              {segments.length > 0 ? (
                <div className="w-full h-full rounded-full shadow-[0_0_15px_rgba(0,0,0,0.2)] border-4 border-gray-800 overflow-hidden" style={{ background: `conic-gradient(${wheelGradient})`, transform: `rotate(${rotation}deg)`, transition: rouletteState === 'idle' ? 'none' : 'transform 4s cubic-bezier(0.25, 1, 0.3, 1)' }}></div>
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 border-4 border-gray-400 flex items-center justify-center text-gray-400 font-bold">경품 없음</div>
              )}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full border-4 border-gray-800 shadow-inner z-10 flex items-center justify-center"><Gift size={20} className="text-gray-800" /></div>
            </div>
            
            <div className="w-full min-h-[60px] mb-6 flex items-center justify-center">
               {rouletteState === 'result' ? (
                 <div className="animate-fade-in-up text-center w-full bg-gray-50 py-3 rounded-xl border border-gray-200">
                    <span className="text-xs font-bold text-gray-500 mb-1 block">당첨 결과</span>
                    <span className={`text-xl font-black ${wonPrize?.name?.includes('꽝') ? 'text-gray-500' : 'text-red-500'}`}>{wonPrize?.name}</span>
                 </div>
               ) : (
                 <div className="flex flex-wrap justify-center gap-2 max-h-20 overflow-y-auto w-full custom-scrollbar px-1">
                   {segments.map(s => (
                     <div key={s.id} className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full border border-gray-200">
                       <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }}></div><span className="truncate max-w-[100px]">{s.name}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
            
            {rouletteState === 'idle' && <button onClick={executeSpin} className="w-full bg-yellow-500 text-white font-bold py-4 rounded-xl border-b-4 border-yellow-600 hover:bg-yellow-400 active:border-b-0 active:translate-y-1 text-xl transition-all">룰렛 돌리기!</button>}
            {rouletteState === 'spinning' && <button disabled className="w-full bg-gray-300 text-gray-500 font-bold py-4 rounded-xl text-xl cursor-not-allowed">회전 중...</button>}
            {rouletteState === 'result' && <button onClick={() => handleFinishDayAndSave(false)} className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl border-b-4 border-blue-700 hover:bg-blue-400 active:border-b-0 active:translate-y-1 text-lg transition-all flex items-center justify-center gap-2">확인 및 다음 날 시작 <ChevronRight size={20} /></button>}
          </div>
        </div>
      )}

      {confirmConfig && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80 text-center animate-fade-in-up">
            <h3 className="text-base font-bold mb-6 text-gray-800 whitespace-pre-wrap leading-relaxed">{confirmConfig.message}</h3>
            <div className="flex gap-3">
              <button onClick={() => setConfirmConfig(null)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300">취소</button>
              <button onClick={confirmConfig.onConfirm} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// Encounter Screen
// ==========================================
function EncounterScreen({ state, patient, medications, globalSettings, comorbidityList, onComplete }) {
  const [phase, setPhase] = useState('intro'); 
  const [dialogue, setDialogue] = useState(`선생님, ${patient?.desc}`);
  const [localAdherence, setLocalAdherence] = useState(patient?.adherence || '좋음');

  const retroBoxClass = "bg-white border-[3px] border-black rounded shadow-[inset_0_0_0_1px_#fff,inset_0_0_0_3px_#000] p-3 font-['NeoDunggeunmo',monospace] text-black text-sm sm:text-base tracking-wide flex flex-col justify-center leading-tight break-keep min-h-[48px]";
  const maxOpts = Number(globalSettings?.maxPrescriptionOptions) || 6;
  const availableOptions = useMemo(() => medications.filter(m => m.type === patient?.type).slice(0, maxOpts), [medications, patient?.type, maxOpts]);
  
  const encounterDoctorImg = globalSettings?.encounterDoctorImg || null;

  const retroBgStyle = {
    backgroundImage: globalSettings?.backgroundImgUrl ? `url(${globalSettings.backgroundImgUrl})` : 'url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+CjxyZWN0IHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgZmlsbD0iI2U1ZTVlNSIvPgo8cGF0aCBkPSJNMCAwaDQwdjQwSDB6IiBmaWxsPSJub25lIiBzdHJva2U9IiNjY2MiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=")',
    backgroundSize: globalSettings?.backgroundImgUrl ? 'cover' : 'auto',
    backgroundPosition: 'center',
    backgroundRepeat: globalSettings?.backgroundImgUrl ? 'no-repeat' : 'repeat',
  };

  useEffect(() => {
    if (phase === 'intro') {
      const timer = setTimeout(() => { setPhase('menu'); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleAction = (action) => {
    if (action === 'prescribe') { setPhase('prescribe'); setDialogue(`${patient?.type} 환자에게 어떤 처방을 내릴까?`); }
    else if (action === 'chart') {
      setPhase('chart');
      let text = `[차트 요약]\n나이:${patient?.age} 성별:${patient?.gender} 체중:${patient?.weight}kg BMI:${patient?.bmi}\n유형:${patient?.type} HbA1c:${patient?.initialHba1c}%\n순응도: ${localAdherence}`;
      if (patient?.comorbidities && patient.comorbidities.length > 0) text += `\n동반질환: ${patient.comorbidities.join(', ')}`;
      if ((patient?.type === '재진' || patient?.type === '리핏') && patient?.prevTreatment) text += `\n[이전 치료기록]\n${patient.prevTreatment}`;
      
      // 과거 피드백 기록 불러오기
      const pastLogs = (state.logs || []).filter(l => l.patientId === patient.id && l.patientFeedback && l.day < state.day);
      if (pastLogs.length > 0) {
        text += `\n\n[과거 반응 기록]`;
        pastLogs.forEach(l => {
          text += `\n- ${l.day}일차: "${l.patientFeedback}"`;
        });
      }

      setDialogue(text);
    } else if (action === 'run') { setDialogue("도망칠 수 없다! 환자가 당신만 바라보고 있다."); setTimeout(() => setDialogue("무엇을 할까?"), 1500); }
  };

  const handleSelectDrug = async (drug) => {
    let baseHba1c = Number(patient?.initialHba1c) || 7.0;
    let effect = Number(drug.effect) || 0;
    let newHba1c = baseHba1c;
    let textResult = `${patient?.name}에게\n[${drug.name}] 처방!\n\n`;
    let currentAdherence = localAdherence;
    let sideEffectOccurred = false;
    let feedbackMsgs = [];

    if (drug.isPackaging && currentAdherence === '나쁨') {
      currentAdherence = '좋음'; setLocalAdherence('좋음');
      textResult += `병포장 덕분에 환자가 약을 잘 먹기로 했다! (순응도 개선)\n\n`;
    }

    const pComorb = patient?.comorbidities || [];
    const mBen = drug.beneficialComorb || [];
    const mWor = drug.worseningComorb || [];
    const overlapBen = pComorb.filter(c => mBen.includes(c));
    const overlapWor = pComorb.filter(c => mWor.includes(c));

    // 병용질환 관련 피드백 생성 (혈당 변동 없음)
    overlapBen.forEach(cName => {
      const cObj = comorbidityList.find(c => c.name === cName);
      if (cObj) feedbackMsgs.push(cObj.goodMsg);
    });
    overlapWor.forEach(cName => {
      const cObj = comorbidityList.find(c => c.name === cName);
      if (cObj) feedbackMsgs.push(cObj.badMsg);
    });

    if (feedbackMsgs.length > 0) {
      textResult += `[환자 피드백]\n${feedbackMsgs.map(f => `"${f}"`).join('\n')}\n\n`;
    }

    if (currentAdherence === '나쁨') {
      newHba1c = baseHba1c + 0.4;
      textResult += `하지만 환자가 약을 제대로 먹지 않았다...\n오히려 혈당 증가!\n\n`;
    } else {
      if (Math.random() * 100 < (Number(drug.sideEffectProb) || 0)) {
          sideEffectOccurred = true;
          newHba1c = baseHba1c - (effect * 0.5); 
          textResult += `[부작용 발생]\n"${drug.sideEffectMsg}"\n약효가 절반으로 감소했습니다.\n\n`;
      } else {
          newHba1c = baseHba1c - effect;
          textResult += `효과가 발군이다!\n\n`;
      }
    }
    
    // 강제 숫자 형변환 및 소수점 보정 (NaN 방지)
    newHba1c = Number(Number(newHba1c).toFixed(1)) || baseHba1c;
    textResult += `예상 당화혈색소: ${baseHba1c.toFixed(1)}% -> ${newHba1c.toFixed(1)}%`;
    setDialogue(textResult);
    setPhase('result');

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', state.id);
      const newLog = {
        id: Date.now().toString(), day: Number(state.day), patientId: patient.id, patientName: patient.name, patientType: patient.type,
        drugName: drug.name, oldHba1c: baseHba1c, newHba1c: newHba1c, adherenceStatus: currentAdherence, hadSideEffect: sideEffectOccurred, 
        drugClasses: drug.classes || [], patientFeedback: feedbackMsgs.join(' '), timestamp: new Date().toISOString()
      };
      await updateDoc(docRef, { logs: [...(state.logs || []), newLog], completedToday: [...(state.completedToday || []), patient.id], score: Number(state.score) + 10 });
    } catch (e) {
      console.error("Prescription Save Error:", e);
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-[#F0F0F0] flex flex-col font-['NeoDunggeunmo',monospace] select-none">
      <div className="flex-[4] p-4 flex flex-col justify-between relative z-0" style={retroBgStyle}>
        <div className="self-end w-[60%] mb-4 mt-2 mr-2">
           <div className="bg-[#FFFFB0] border-[3px] border-black rounded shadow-[2px_2px_0_0_rgba(0,0,0,1)] p-2 relative z-10">
              <div className="flex justify-between items-end border-b-2 border-black pb-1 mb-1"><span className="text-lg font-bold truncate">{patient?.name}</span><span className="text-xs bg-black text-white px-1 rounded shrink-0">{patient?.type}</span></div>
              <div className="flex justify-between text-xs mt-1"><span>BMI:{patient?.bmi}</span><span>HbA1c: <span className="text-red-600 font-bold">{patient?.initialHba1c}%</span></span></div>
           </div>
        </div>
        <div className="flex justify-between items-end px-4 mb-2 relative h-32">
          <div className="w-24 h-24 relative flex flex-col justify-end items-center self-end mb-[-1rem]">
             {encounterDoctorImg ? ( <img src={encounterDoctorImg} className="w-full h-full object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]" /> ) : (
                <div className="w-full h-full bg-indigo-200 border-4 border-black rounded-t-full relative overflow-hidden flex flex-col justify-end items-center">
                   <div className="w-16 h-12 bg-white border-t-2 border-l-2 border-r-2 border-black rounded-t-lg relative"><div className="absolute top-2 left-2 w-3 h-3 bg-red-400 rounded-full"></div></div>
                </div>
             )}
          </div>
          <div className="w-24 h-28 relative mb-8 mr-4">
             <div className="absolute bottom-0 w-24 h-6 bg-gray-400 rounded-[100%] border-2 border-gray-600 opacity-50 z-0"></div>
             <div className="relative z-10 w-24 h-24 mx-auto flex flex-col items-center justify-end">
                {patient?.imageUrl ? ( <img src={patient.imageUrl} className="max-w-full max-h-full object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.5)]" /> ) : (
                   <div className="w-16 h-24 bg-orange-100 border-4 border-black rounded-t-[2rem] rounded-b-md flex flex-col items-center justify-start pt-3">
                      <div className="flex gap-2 mb-3"><div className="w-2 h-3 bg-black rounded-full"></div><div className="w-2 h-3 bg-black rounded-full"></div></div>
                      <div className="w-6 h-2 bg-black rounded-full mt-1"></div>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
      <div className="flex-[5] p-3 bg-[#D0D0D0] border-t-4 border-black flex flex-col gap-3 relative z-10 overflow-y-auto custom-scrollbar">
        <div className={`${retroBoxClass} min-h-[100px] shadow-inner items-start justify-start shrink-0`}>
          <div className="w-full whitespace-pre-wrap">{dialogue}</div>
          {(phase === 'result' || phase === 'chart') && <span className="animate-pulse cursor-pointer mt-4 block w-full text-right shrink-0" onClick={() => { if (phase === 'result') onComplete(); if (phase === 'chart') { setPhase('menu'); setDialogue("무엇을 할까?"); }}}>▼ 계속</span>}
        </div>
        <div className="flex flex-col flex-1 h-full">
          {phase === 'menu' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
              <button onClick={() => handleAction('prescribe')} className={`${retroBoxClass} hover:bg-gray-100 cursor-pointer active:bg-gray-200 items-start text-left`}>▶ 처방하기</button>
              <button onClick={() => handleAction('chart')} className={`${retroBoxClass} hover:bg-gray-100 cursor-pointer active:bg-gray-200 items-start text-left`}>▶ 차트보기</button>
              <button onClick={() => handleAction('run')} className={`${retroBoxClass} hover:bg-gray-100 cursor-pointer text-gray-400 active:bg-gray-200 items-start text-left sm:col-span-2`}>▶ 도망간다</button>
            </div>
          )}
          {phase === 'prescribe' && (
            <div className="flex flex-col gap-2 h-full justify-between pb-2">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableOptions.map(drug => (
                    <button key={drug.id} onClick={() => handleSelectDrug(drug)} className={`${retroBoxClass} hover:bg-gray-100 cursor-pointer active:bg-gray-200 items-start text-left whitespace-normal h-auto`} title={drug.desc}>
                      {drug.isPackaging ? `💊 ${drug.name}` : `▶ ${drug.name}`}
                    </button>
                  ))}
               </div>
               <button onClick={() => { setPhase('menu'); setDialogue("무엇을 할까?"); }} className={`${retroBoxClass} hover:bg-gray-100 cursor-pointer active:bg-gray-200 text-center items-center shrink-0 mt-2`}>취소</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Admin Screen
// ==========================================
function AdminScreen({ patients, medications, drugClasses, deductionRules, prizes, allGameStates, globalSettings, comorbidityList, onLogout }) {
  const [tab, setTab] = useState('settings'); 
  const [confirmConfig, setConfirmConfig] = useState(null);

  const [editingPatient, setEditingPatient] = useState(null);
  const [editingMed, setEditingMed] = useState(null);
  const [editingPrize, setEditingPrize] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [editingRule, setEditingRule] = useState(null);
  
  const [newComorb, setNewComorb] = useState({ name: '', goodMsg: '', badMsg: '' });

  const [patientImgBase64, setPatientImgBase64] = useState('');
  const [docImgObj, setDocImgObj] = useState({ base: '', d3: '', d5: '', d10: '', d15: '', d20: '', bg: '', loginLogo: '', encounter: '' });

  const triggerConfirm = (message, onConfirm) => setConfirmConfig({ message, onConfirm });

  const handleSaveDoc = async (colName, data, id) => {
    try {
      let docId = id || `${colName}_${Date.now()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, docId), { ...data, id: docId });
    } catch(e) { console.error(e); }
  };
  const handleDeleteDoc = (colName, id) => triggerConfirm('정말 삭제하시겠습니까?', async () => { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, id)); setConfirmConfig(null); });

  const handleSavePatient = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const selComorbidities = comorbidityList.map(c => c.name).filter(cName => fd.get(`p_comorb_${cName}`) === 'true');
    const pData = { name: fd.get('name'), age: Number(fd.get('age'))||0, gender: fd.get('gender'), weight: Number(fd.get('weight'))||0, bmi: Number(fd.get('bmi'))||0, initialHba1c: Number(fd.get('initialHba1c'))||0, type: fd.get('type'), desc: fd.get('desc'), prevTreatment: fd.get('prevTreatment') || '', adherence: fd.get('adherence'), order: Number(fd.get('order'))||0, imageUrl: patientImgBase64 || editingPatient?.imageUrl || '', comorbidities: selComorbidities };
    handleSaveDoc('patients', pData, editingPatient.id).then(() => { setEditingPatient(null); setPatientImgBase64(''); });
  };

  const handleSaveMed = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const classes = [fd.get('class1'), fd.get('class2'), fd.get('class3')].filter(c => c && c !== 'none');
    const beneficialComorb = comorbidityList.map(c => c.name).filter(cName => fd.get(`m_ben_${cName}`) === 'true');
    const worseningComorb = comorbidityList.map(c => c.name).filter(cName => fd.get(`m_wor_${cName}`) === 'true');
    const mData = { type: fd.get('type'), name: fd.get('name'), desc: fd.get('desc'), effect: Number(fd.get('effect'))||0, isPackaging: fd.get('isPackaging') === 'true', sideEffectProb: Number(fd.get('sideEffectProb')) || 0, sideEffectMsg: fd.get('sideEffectMsg') || '', classes, beneficialComorb, worseningComorb };
    handleSaveDoc('medications', mData, editingMed.id).then(() => setEditingMed(null));
  };

  const handleSaveClass = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    handleSaveDoc('drugClasses', { name: fd.get('name'), allowDuplicate: fd.get('allowDuplicate') === 'true' }, editingClass.id).then(() => setEditingClass(null));
  };

  const handleSaveRule = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const selClasses = [];
    drugClasses.forEach(dc => { if(fd.get(`rc_${dc.id}`) === 'true') selClasses.push(dc.id); });
    if(selClasses.length < 2) return alert('2개 이상의 계열을 선택해야 조합이 성립됩니다.');
    handleSaveDoc('deductionRules', { classes: selClasses }, editingRule.id).then(() => setEditingRule(null));
  };

  const handleSavePrize = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    handleSaveDoc('prizes', { name: fd.get('name'), probability: Number(fd.get('probability')) || 0 }, editingPrize.id).then(() => setEditingPrize(null));
  };

  const handleAddComorb = async () => {
    if (!newComorb.name.trim() || comorbidityList.some(c => c.name === newComorb.name.trim())) return;
    const updated = [...comorbidityList, { name: newComorb.name.trim(), goodMsg: newComorb.goodMsg.trim(), badMsg: newComorb.badMsg.trim() }];
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), { comorbidities: updated }, { merge: true }); } catch(e) { console.error(e); }
    setNewComorb({ name: '', goodMsg: '', badMsg: '' });
  };
  const handleDeleteComorb = (targetName) => {
    triggerConfirm(`'${targetName}' 질환을 전체 목록에서 삭제하시겠습니까?`, async () => {
      const updated = comorbidityList.filter(c => c.name !== targetName);
      try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), { comorbidities: updated }, { merge: true }); } catch(e) { console.error(e); }
      setConfirmConfig(null);
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const newGlobal = {
      loginBgStart: fd.get('loginBgStart') || '#6366f1', 
      loginBgEnd: fd.get('loginBgEnd') || '#9333ea', 
      loginBtnColor: fd.get('loginBtnColor') || '#6366f1',
      maxPrescriptionOptions: Number(fd.get('maxOpts')) || 6,
      patientsPerDay: Number(fd.get('patientsPerDay')) || 2,
      allowMultipleDaysPerRealDay: fd.get('allowMultipleDaysPerRealDay') === 'true',
      loginLogoUrl: docImgObj.loginLogo !== '' ? docImgObj.loginLogo : (globalSettings?.loginLogoUrl || ''),
      dashboardBaseImg: docImgObj.base !== '' ? docImgObj.base : (globalSettings?.dashboardBaseImg || ''),
      encounterDoctorImg: docImgObj.encounter !== '' ? docImgObj.encounter : (globalSettings?.encounterDoctorImg || ''),
      img3: docImgObj.d3 !== '' ? docImgObj.d3 : (globalSettings?.img3 || ''),
      img5: docImgObj.d5 !== '' ? docImgObj.d5 : (globalSettings?.img5 || ''),
      img10: docImgObj.d10 !== '' ? docImgObj.d10 : (globalSettings?.img10 || ''),
      img15: docImgObj.d15 !== '' ? docImgObj.d15 : (globalSettings?.img15 || ''),
      img20: docImgObj.d20 !== '' ? docImgObj.d20 : (globalSettings?.img20 || ''),
      backgroundImgUrl: docImgObj.bg !== '' ? docImgObj.bg : (globalSettings?.backgroundImgUrl || '')
    };
    try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), newGlobal, { merge: true }); } catch(e) { console.error(e); }
    setDocImgObj({ base: '', d3: '', d5: '', d10: '', d15: '', d20: '', bg: '', loginLogo: '', encounter: '' });
    triggerConfirm('환경 설정이 저장되었습니다.', () => setConfirmConfig(null));
  };

  const handleImgChange = (key, file, maxWidth=200) => processImageFile(file, (base64) => setDocImgObj(prev => ({...prev, [key]: base64})), maxWidth);

  const handleDeleteLogAdmin = (empId, logId, patientId, logDay) => {
    triggerConfirm('이 처방 기록을 삭제하시겠습니까?', async () => {
      try {
        const state = allGameStates.find(s => s.empId === empId); if (!state) return;
        const newLogs = (state.logs || []).filter(l => l.id !== logId);
        const newCompleted = state.day === logDay ? (state.completedToday || []).filter(id => id !== patientId) : state.completedToday;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', state.id), { logs: newLogs, completedToday: newCompleted, score: Math.max(0, Number(state.score) - 10) }); 
      } catch(e) { console.error(e); }
      setConfirmConfig(null);
    });
  };

  const handleExportCSV = () => {
    let csv = '\uFEFF'; const maxDay = 20; const headers = ['사번'];
    for (let i = 1; i <= maxDay; i++) headers.push(`${i}일차 처방내역`);
    csv += headers.join(',') + '\n';
    allGameStates.forEach(state => {
      const row = [state.empId];
      for (let i = 1; i <= maxDay; i++) {
        const dayLogs = (state.logs || []).filter(l => l.day === i);
        row.push(dayLogs.length > 0 ? `"${dayLogs.map(l => `[${l.patientName}] ${l.drugName} (${l.newHba1c}%)`).join(' / ')}"` : '');
      }
      csv += row.join(',') + '\n';
    });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); a.download = 'persona_records.csv'; a.click();
  };

  const totalProb = prizes.reduce((acc, p) => acc + (Number(p.probability) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border-l-8 border-indigo-600">
          <div>
            <h1 className="text-3xl font-black text-gray-800 flex items-center gap-2 tracking-tight"><ShieldAlert className="text-red-500" size={32}/> Persona 관리자</h1>
            <p className="text-gray-500 mt-1 font-medium">환자, 약물, 룰렛, 보험 계열/삭감, 비주얼 환경 관리</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-bold"><LogOut size={20} /> 로그아웃</button>
        </div>

        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setTab('settings')} className={`px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${tab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Settings size={18} /> 설정 및 테마</button>
          <button onClick={() => setTab('patients')} className={`px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${tab === 'patients' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Users size={18} /> 환자</button>
          <button onClick={() => setTab('medications')} className={`px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${tab === 'medications' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Pill size={18} /> 처방약</button>
          <button onClick={() => setTab('classes')} className={`px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${tab === 'classes' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><AlertTriangle size={18} /> 계열/보험 및 질환</button>
          <button onClick={() => setTab('prizes')} className={`px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${tab === 'prizes' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Gift size={18} /> 룰렛 경품</button>
          <button onClick={() => setTab('records')} className={`px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 ${tab === 'records' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50'}`}><Activity size={18} /> 직원 기록</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          
          {/* ================= SETTINGS TAB ================= */}
          {tab === 'settings' && (
            <div className="animate-fade-in-up">
              <h2 className="text-2xl font-black mb-2 text-indigo-900">환경 & 테마 설정</h2>
              <p className="text-gray-500 mb-8">게임 디자인, 하루 진행 시스템, 의사 이미지를 각각 나누어 상세히 설정할 수 있습니다.</p>
              
              <form onSubmit={handleSaveSettings} className="space-y-8">
                
                <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">시작(로그인) 화면 테마</h3>
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1"><label className="block text-xs font-bold mb-1">배경 시작 색상</label><input type="color" name="loginBgStart" defaultValue={globalSettings?.loginBgStart || '#6366f1'} className="w-full h-10 border rounded cursor-pointer"/></div>
                      <div className="flex-1"><label className="block text-xs font-bold mb-1">배경 끝 색상</label><input type="color" name="loginBgEnd" defaultValue={globalSettings?.loginBgEnd || '#9333ea'} className="w-full h-10 border rounded cursor-pointer"/></div>
                      <div className="flex-1"><label className="block text-xs font-bold mb-1">버튼 색상</label><input type="color" name="loginBtnColor" defaultValue={globalSettings?.loginBtnColor || '#6366f1'} className="w-full h-10 border rounded cursor-pointer"/></div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">시작 화면 메인 로고 업로드</label>
                      <label className="flex items-center justify-center gap-2 cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold text-gray-700">
                        <Upload size={16} /> 사진첩에서 선택
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImgChange('loginLogo', e.target.files[0], 300)} />
                      </label>
                      {(docImgObj.loginLogo || globalSettings?.loginLogoUrl) && <img src={docImgObj.loginLogo || globalSettings.loginLogoUrl} className="mt-2 h-16 object-contain" />}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-indigo-900 mb-4 border-b border-indigo-200 pb-2">시스템 옵션</h3>
                    
                    <label className="block text-sm font-bold text-gray-700 mb-1">환자별 처방 옵션 노출 개수</label>
                    <input type="number" name="maxOpts" defaultValue={globalSettings?.maxPrescriptionOptions || 6} className="w-full p-3 border rounded-lg" min="1" max="18" />
                    
                    <label className="block text-sm font-bold text-gray-700 mb-1 mt-4">하루 진료 환자 수</label>
                    <input type="number" name="patientsPerDay" defaultValue={globalSettings?.patientsPerDay || 2} className="w-full p-3 border rounded-lg" min="1" max="20" />

                    <label className="block text-sm font-bold text-gray-700 mb-1 mt-4">진도 (일차) 제한 설정</label>
                    <select name="allowMultipleDaysPerRealDay" defaultValue={globalSettings?.allowMultipleDaysPerRealDay ? 'true' : 'false'} className="w-full p-3 border rounded-lg">
                      <option value="true">제한 없음 (하루에 20일차까지 모두 진행 가능)</option>
                      <option value="false">하루에 1일차씩만 진행 (현실 시간 기준 자정 리셋)</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                    <User className="text-indigo-500"/> 1. 진료실(Encounter) 화면 캐릭터 및 배경 설정
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">진료실 의사(플레이어) 뒷모습 이미지</label>
                      <label className="flex items-center justify-center gap-2 cursor-pointer bg-white px-4 py-6 border-2 border-dashed border-indigo-300 rounded-xl hover:bg-indigo-50 text-indigo-600 font-bold mb-3">
                        <Upload size={20}/> 캐릭터 선택 (PNG 투명배경 권장)
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImgChange('encounter', e.target.files[0])} />
                      </label>
                      <div className="w-24 h-24 bg-gray-200 border-2 border-gray-400 rounded-lg mx-auto flex items-end justify-center overflow-hidden">
                         {(docImgObj.encounter || globalSettings?.encounterDoctorImg) ? (
                           <img src={docImgObj.encounter || globalSettings.encounterDoctorImg} className="w-full h-full object-contain" />
                         ) : <span className="text-[10px] text-gray-500 mb-2 font-bold">기본 (도형)</span>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">진료실 배경(Background) 이미지</label>
                      <label className="flex items-center justify-center gap-2 cursor-pointer bg-white px-4 py-6 border-2 border-dashed border-indigo-300 rounded-xl hover:bg-indigo-50 text-indigo-600 font-bold mb-3">
                        <Upload size={20}/> 넓은 배경화면 선택
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImgChange('bg', e.target.files[0], 600)} />
                      </label>
                      <div className="w-full h-24 bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                         {(docImgObj.bg || globalSettings?.backgroundImgUrl) ? (
                           <div className="w-full h-full" style={{ backgroundImage: `url(${docImgObj.bg || globalSettings.backgroundImgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                         ) : <span className="text-[10px] text-gray-400 font-bold">기본 패턴 배경</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                    <Flame className="text-orange-500"/> 2. 대시보드 (메인 화면) 연속진료 프로필 진화 설정
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">로그인 후 진료를 시작하기 전 대기실(대시보드)에 표시되는 원장님의 동그란 프로필입니다.</p>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {[
                      { key: 'base', label: '기본 (0~2일)', v: docImgObj.base, gv: globalSettings?.dashboardBaseImg },
                      { key: 'd3', label: '3일 연속', v: docImgObj.d3, gv: globalSettings?.img3 },
                      { key: 'd5', label: '5일 연속', v: docImgObj.d5, gv: globalSettings?.img5 },
                      { key: 'd10', label: '10일 연속', v: docImgObj.d10, gv: globalSettings?.img10 },
                      { key: 'd15', label: '15일 연속', v: docImgObj.d15, gv: globalSettings?.img15 },
                      { key: 'd20', label: '20일 연속', v: docImgObj.d20, gv: globalSettings?.img20 },
                    ].map(item => (
                      <div key={item.key} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                        <label className="text-xs font-bold text-indigo-700 mb-2">{item.label}</label>
                        <div className="w-12 h-12 bg-gray-100 rounded-full border border-dashed border-gray-300 mb-2 flex items-center justify-center overflow-hidden shrink-0">
                          {item.v || item.gv ? <img src={item.v || item.gv} className="w-full h-full object-cover"/> : <User className="text-gray-300" size={16} />}
                        </div>
                        <label className="cursor-pointer bg-gray-50 border px-2 py-1 rounded text-[10px] font-bold hover:bg-gray-100 w-full text-center">
                          <Upload size={12} className="inline mr-1"/>변경
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImgChange(item.key, e.target.files[0])} />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                   <button type="submit" className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-indigo-700 text-lg shadow-md active:translate-y-1">모든 설정 저장하기</button>
                </div>
              </form>
            </div>
          )}

          {/* ================= CLASSES & INSURANCE & COMORBIDITIES TAB ================= */}
          {tab === 'classes' && (
            <div className="animate-fade-in-up grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-indigo-900">약제 계열 (Class) 추가</h2>
                    <button onClick={() => setEditingClass({ allowDuplicate: false })} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-200"><Plus size={16}/> 계열 추가</button>
                  </div>
                  
                  {editingClass && (
                    <form onSubmit={handleSaveClass} className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 mb-4">
                      <input name="name" defaultValue={editingClass.name} placeholder="계열명 (예: DPP4i)" required className="w-full p-2 border rounded mb-2"/>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3">
                        <input type="checkbox" name="allowDuplicate" value="true" defaultChecked={editingClass.allowDuplicate} />
                        동일 계열 중복 처방 허용 (체크 시 삭감 무시)
                      </label>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingClass(null)} className="px-3 py-1 bg-gray-200 rounded font-bold text-sm">취소</button>
                        <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded font-bold text-sm">저장</button>
                      </div>
                    </form>
                  )}

                  <ul className="bg-white border rounded-xl divide-y">
                    {drugClasses.map(c => (
                      <li key={c.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                        <div>
                           <span className="font-bold">{c?.name}</span>
                           {c?.allowDuplicate && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1 rounded border border-green-200">중복가능</span>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingClass(c)} className="text-blue-500 p-1 bg-blue-50 rounded hover:bg-blue-100"><Edit size={14}/></button>
                          <button onClick={() => handleDeleteDoc('drugClasses', c.id)} className="text-red-500 p-1 bg-red-50 rounded hover:bg-red-100"><Trash2 size={14}/></button>
                        </div>
                      </li>
                    ))}
                    {drugClasses.length === 0 && <li className="p-4 text-center text-gray-400 text-sm">등록된 계열이 없습니다.</li>}
                  </ul>
               </div>

               <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-red-900">보험 삭감 (금기) 조합 설정</h2>
                    <button onClick={() => setEditingRule({ classes: [] })} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-red-200"><Plus size={16}/> 조합 추가</button>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">함께 처방 시 보험 삭감이 되는 계열 조합을 체크하세요. 일일 결산 시 룰렛 기회가 박탈됩니다.</p>

                  {editingRule && (
                    <form onSubmit={handleSaveRule} className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4">
                      <p className="text-sm font-bold text-red-800 mb-2">금기 시킬 2개 이상의 계열을 선택하세요:</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {drugClasses.map(dc => (
                          <label key={dc.id} className="flex items-center gap-1 bg-white px-2 py-1 rounded border text-sm cursor-pointer hover:bg-red-50">
                            <input type="checkbox" name={`rc_${dc.id}`} value="true" defaultChecked={(editingRule.classes || []).includes(dc.id)} />
                            {dc.name}
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingRule(null)} className="px-3 py-1 bg-gray-200 rounded font-bold text-sm">취소</button>
                        <button type="submit" className="px-3 py-1 bg-red-600 text-white rounded font-bold text-sm">저장</button>
                      </div>
                    </form>
                  )}

                  <ul className="bg-white border rounded-xl divide-y mb-8">
                    {deductionRules.map(r => (
                      <li key={r.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                        <div className="flex flex-wrap gap-1 items-center">
                           <AlertTriangle size={14} className="text-red-500 mr-1"/>
                           {(r.classes || []).map((rc, i) => {
                             const name = drugClasses.find(d => d.id === rc)?.name || '알수없음';
                             return <React.Fragment key={rc}>
                               <span className="font-bold text-red-700 bg-red-50 px-1 rounded border border-red-100">{name}</span>
                               {i < (r.classes?.length || 0) - 1 && <span className="text-gray-400 font-bold">+</span>}
                             </React.Fragment>
                           })}
                        </div>
                        <button onClick={() => handleDeleteDoc('deductionRules', r.id)} className="text-red-500 p-1 bg-red-50 rounded hover:bg-red-100 shrink-0 ml-2"><Trash2 size={14}/></button>
                      </li>
                    ))}
                    {deductionRules.length === 0 && <li className="p-4 text-center text-gray-400 text-sm">등록된 삭감 조합이 없습니다.</li>}
                  </ul>

                  {/* 질환 관리 영역 */}
                  <div className="pt-6 border-t border-gray-200">
                    <h2 className="text-xl font-bold text-teal-900 mb-2">환자 병용 질환군 (Comorbidities) 관리</h2>
                    <p className="text-xs text-gray-500 mb-4">환자가 가진 질환과 약 처방에 따른 피드백(대사)을 설정하세요.</p>
                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
                      <div className="flex flex-col gap-2 mb-4">
                        <input value={newComorb.name} onChange={e=>setNewComorb({...newComorb, name: e.target.value})} placeholder="새로운 질환명 (예: 골다공증)" className="p-2 border rounded-lg shadow-sm text-sm"/>
                        <input value={newComorb.goodMsg} onChange={e=>setNewComorb({...newComorb, goodMsg: e.target.value})} placeholder="이점 약물 처방 시 피드백 (예: 뼈도 튼튼해지는 것 같아요!)" className="p-2 border rounded-lg shadow-sm text-sm"/>
                        <input value={newComorb.badMsg} onChange={e=>setNewComorb({...newComorb, badMsg: e.target.value})} placeholder="악화 약물 처방 시 피드백 (예: 관절이 더 쑤십니다...)" className="p-2 border rounded-lg shadow-sm text-sm"/>
                        <button onClick={handleAddComorb} className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 shadow-sm transition-transform active:scale-95 mt-1">질환 및 피드백 추가하기</button>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {comorbidityList.map(c => (
                          <div key={c.name} className="bg-white border border-teal-300 p-3 rounded-lg text-sm flex justify-between items-start shadow-sm">
                            <div className="flex-1 pr-2">
                              <span className="font-bold text-teal-800 text-base">{c.name}</span>
                              <div className="text-[11px] text-blue-600 mt-1"><span className="font-bold">이점 시:</span> {c.goodMsg}</div>
                              <div className="text-[11px] text-red-500 mt-1"><span className="font-bold">악화 시:</span> {c.badMsg}</div>
                            </div>
                            <button onClick={() => handleDeleteComorb(c.name)} className="text-red-500 hover:text-red-700 p-2 bg-red-50 rounded"><Trash2 size={16}/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* ================= MEDICATIONS ================= */}
          {tab === 'medications' && (
            <div className="animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">처방약 관리</h2>
                <button onClick={() => setEditingMed({ type: '초진', effect: 1.0, isPackaging: false, sideEffectProb: 0 })} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700"><Plus size={18} /> 새 약물 추가</button>
              </div>

              {editingMed && (
                <div className="mb-8 p-6 bg-green-50 rounded-xl border-2 border-green-200 shadow-inner">
                  <h3 className="font-bold mb-4 text-green-900">{editingMed.id ? '약물 정보 수정' : '새 약물 추가'}</h3>
                  <form onSubmit={handleSaveMed} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div><label className="block text-sm font-bold text-gray-600 mb-1">대상 유형</label><select name="type" defaultValue={editingMed.type} className="w-full p-2 border rounded font-bold text-indigo-700"><option value="초진">초진</option><option value="재진">재진</option><option value="리핏">리핏</option></select></div>
                    <div><label className="block text-sm font-bold text-gray-600 mb-1">약품/처방명</label><input name="name" defaultValue={editingMed.name} required className="w-full p-2 border rounded" /></div>
                    <div><label className="block text-sm font-bold text-gray-600 mb-1">혈당 강하 효과 (-%)</label><input type="number" step="0.1" name="effect" defaultValue={editingMed.effect} required className="w-full p-2 border rounded" /></div>
                    <div>
                      <label className="block text-sm font-bold text-gray-600 mb-1">병포장 (순응도 개선)</label>
                      <select name="isPackaging" defaultValue={editingMed.isPackaging ? 'true' : 'false'} className="w-full p-2 border rounded font-bold text-orange-600"><option value="false">미사용</option><option value="true">적용</option></select>
                    </div>

                    <div className="md:col-span-4 bg-white p-3 rounded border">
                      <label className="block text-sm font-bold text-indigo-800 mb-2">약제가 포함하는 성분 계열 지정 (최대 3개, 복합제 대응)</label>
                      <div className="flex gap-2">
                        {[1, 2, 3].map(num => (
                          <select key={num} name={`class${num}`} defaultValue={(editingMed.classes && editingMed.classes[num-1]) || 'none'} className="flex-1 p-2 border rounded text-sm">
                            <option value="none">-- 계열 {num} 선택 (없음) --</option>
                            {drugClasses.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
                          </select>
                        ))}
                      </div>
                    </div>

                    {/* 이점/악화 질환군 설정 */}
                    <div className="md:col-span-2 bg-blue-50 p-3 rounded border border-blue-200">
                      <label className="block text-sm font-bold text-blue-800 mb-2">이점이 있는 환자 질환군 (차트에 좋은 피드백 추가)</label>
                      <div className="flex flex-wrap gap-2">
                        {comorbidityList.map(c => (
                          <label key={c.name} className="flex items-center gap-1 text-xs border p-1 rounded bg-white cursor-pointer hover:bg-blue-100">
                            <input type="checkbox" name={`m_ben_${c.name}`} value="true" defaultChecked={(editingMed.beneficialComorb || []).includes(c.name)} /> {c.name}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="md:col-span-2 bg-red-50 p-3 rounded border border-red-200">
                      <label className="block text-sm font-bold text-red-800 mb-2">악화되는 환자 질환군 (차트에 불만 피드백 추가)</label>
                      <div className="flex flex-wrap gap-2">
                        {comorbidityList.map(c => (
                          <label key={c.name} className="flex items-center gap-1 text-xs border p-1 rounded bg-white cursor-pointer hover:bg-red-100">
                            <input type="checkbox" name={`m_wor_${c.name}`} value="true" defaultChecked={(editingMed.worseningComorb || []).includes(c.name)} /> {c.name}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div><label className="block text-sm font-bold text-red-600 mb-1">기본 부작용 발생 확률 (%)</label><input type="number" name="sideEffectProb" defaultValue={editingMed.sideEffectProb || 0} placeholder="0~100" className="w-full p-2 border rounded bg-red-50" /></div>
                    <div className="md:col-span-3"><label className="block text-sm font-bold text-red-600 mb-1">기본 부작용 메시지 (확률 당첨 시 노출)</label><input name="sideEffectMsg" defaultValue={editingMed.sideEffectMsg || ''} className="w-full p-2 border rounded bg-red-50" /></div>
                    <div className="md:col-span-4"><label className="block text-sm font-bold text-gray-600 mb-1">설명</label><input name="desc" defaultValue={editingMed.desc} required className="w-full p-2 border rounded" /></div>
                    
                    <div className="md:col-span-4 flex justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setEditingMed(null)} className="px-5 py-2 bg-gray-300 text-gray-800 rounded-lg font-bold">취소</button>
                      <button type="submit" className="px-5 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">저장</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {['초진', '재진', '리핏'].map(mType => (
                  <div key={mType} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <div className={`p-3 font-bold text-white text-center ${mType === '초진' ? 'bg-blue-500' : mType === '재진' ? 'bg-purple-500' : 'bg-orange-500'}`}>{mType} 처방 옵션</div>
                    <ul className="divide-y divide-gray-100">
                      {medications.filter(m => m.type === mType).map(med => (
                        <li key={med.id} className="p-3 hover:bg-gray-50 flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-bold text-gray-800 flex items-center gap-1 flex-wrap">
                              {med.name} 
                              {med.isPackaging && <span className="text-[10px] bg-orange-100 text-orange-700 px-1 rounded border border-orange-200">병포장</span>}
                              {med.sideEffectProb > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded border border-red-200">부작용{med.sideEffectProb}%</span>}
                            </div>
                            <div className="text-xs text-blue-600 mt-1 flex flex-wrap gap-1">
                               <span className="font-bold text-blue-800 bg-blue-50 px-1 rounded border border-blue-200">효과: -{med.effect}%</span>
                               {(med.classes || []).map(cId => {
                                 const cName = drugClasses.find(dc => dc.id === cId)?.name;
                                 return cName ? <span key={cId} className="bg-indigo-50 text-indigo-700 px-1 rounded border border-indigo-200">{cName}</span> : null;
                               })}
                            </div>
                            <div className="mt-1 flex flex-col gap-0.5">
                               {(med.beneficialComorb && med.beneficialComorb.length > 0) && <div className="text-[10px] text-blue-600"><span className="font-bold">이점:</span> {med.beneficialComorb.join(', ')}</div>}
                               {(med.worseningComorb && med.worseningComorb.length > 0) && <div className="text-[10px] text-red-500"><span className="font-bold">악화:</span> {med.worseningComorb.join(', ')}</div>}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{med.desc}</div>
                          </div>
                          <div className="flex flex-col gap-1 ml-2 shrink-0">
                             <button onClick={() => setEditingMed(med)} className="p-1 text-blue-500 bg-blue-50 rounded hover:bg-blue-100"><Edit size={14}/></button>
                             <button onClick={() => handleDeleteDoc('medications', med.id)} className="p-1 text-red-500 bg-red-50 rounded hover:bg-red-100"><Trash2 size={14}/></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= PATIENTS ================= */}
          {tab === 'patients' && (
             <div className="animate-fade-in-up">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold">환자 목록 ({patients.length}명)</h2>
               <button onClick={() => { setEditingPatient({ order: patients.length + 1, gender: 'M', type: '초진', weight: 70, bmi: 23.5, adherence: '좋음' }); setPatientImgBase64(''); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700"><Plus size={18} /> 새 환자 추가</button>
             </div>

             {editingPatient && (
               <div className="mb-8 p-6 bg-indigo-50 rounded-xl border-2 border-indigo-200 shadow-inner">
                 <h3 className="font-bold mb-4 text-indigo-900">{editingPatient.id ? '환자 정보 수정' : '새 환자 생성'}</h3>
                 <form onSubmit={handleSavePatient} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   <div><label className="block text-sm font-bold text-gray-600 mb-1">이름</label><input name="name" defaultValue={editingPatient.name} required className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-sm font-bold text-gray-600 mb-1">나이</label><input type="number" name="age" defaultValue={editingPatient.age} required className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-sm font-bold text-gray-600 mb-1">성별</label><select name="gender" defaultValue={editingPatient.gender} className="w-full p-2 border rounded"><option value="M">남성</option><option value="F">여성</option></select></div>
                   <div><label className="block text-sm font-bold text-gray-600 mb-1">유형</label><select name="type" defaultValue={editingPatient.type} className="w-full p-2 border rounded"><option value="초진">초진</option><option value="재진">재진</option><option value="리핏">리핏</option></select></div>
                   <div><label className="block text-sm font-bold text-gray-600 mb-1">체중 (kg)</label><input type="number" step="0.1" name="weight" defaultValue={editingPatient.weight} required className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-sm font-bold text-gray-600 mb-1">BMI</label><input type="number" step="0.1" name="bmi" defaultValue={editingPatient.bmi} required className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-sm font-bold text-gray-600 mb-1">초기 HbA1c</label><input type="number" step="0.1" name="initialHba1c" defaultValue={editingPatient.initialHba1c} required className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-sm font-bold text-gray-600 mb-1">출현 순서</label><input type="number" name="order" defaultValue={editingPatient.order} required className="w-full p-2 border rounded" /></div>
                   <div><label className="block text-sm font-bold text-gray-600 mb-1">복약 순응도</label><select name="adherence" defaultValue={editingPatient.adherence || '좋음'} className="w-full p-2 border rounded font-bold text-blue-700"><option value="좋음">좋음</option><option value="나쁨">나쁨</option></select></div>
                   
                   <div className="md:col-span-3">
                     <label className="block text-sm font-bold text-gray-600 mb-1">동반 질환 선택 (병용 질환군)</label>
                     <div className="flex flex-wrap gap-2 bg-white p-2 rounded border">
                       {comorbidityList.map(c => (
                         <label key={c.name} className="flex items-center gap-1 text-xs border p-1 rounded cursor-pointer hover:bg-indigo-50">
                           <input type="checkbox" name={`p_comorb_${c.name}`} value="true" defaultChecked={(editingPatient.comorbidities || []).includes(c.name)} />
                           {c.name}
                         </label>
                       ))}
                     </div>
                   </div>

                   <div className="md:col-span-4">
                     <label className="block text-sm font-bold text-gray-600 mb-1">이미지 업로드</label>
                     <div className="flex items-center gap-4">
                       <label className="flex gap-2 cursor-pointer bg-white px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold text-gray-700"><Upload size={16} /><input type="file" accept="image/*" className="hidden" onChange={(e) => processImageFile(e.target.files[0], setPatientImgBase64, 200)} /></label>
                       {(patientImgBase64 || editingPatient.imageUrl) && <img src={patientImgBase64 || editingPatient.imageUrl} className="h-10 object-contain bg-gray-200 rounded p-1"/>}
                     </div>
                   </div>
                   <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-600 mb-1">대사(증상)</label><input name="desc" defaultValue={editingPatient.desc} required className="w-full p-2 border rounded" /></div>
                   <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-600 mb-1">이전치료</label><input name="prevTreatment" defaultValue={editingPatient.prevTreatment} className="w-full p-2 border rounded bg-white" /></div>
                   <div className="md:col-span-4 flex justify-end gap-2 mt-2"><button type="button" onClick={() => { setEditingPatient(null); setPatientImgBase64(''); }} className="px-5 py-2 bg-gray-300 rounded-lg font-bold">취소</button><button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold">저장</button></div>
                 </form>
               </div>
             )}
             <div className="overflow-x-auto border rounded-xl"><table className="w-full text-left border-collapse min-w-[900px]">
               <thead className="bg-gray-100 border-b"><tr><th className="p-3">순서/IMG</th><th className="p-3">이름/유형/질환</th><th className="p-3">신체/HbA1c/순응</th><th className="p-3">대사</th><th className="p-3 text-right">관리</th></tr></thead>
               <tbody>{patients.map(p => (<tr key={p.id} className="border-b hover:bg-gray-50">
                 <td className="p-3"><span className="text-gray-500 font-bold">#{p.order}</span><br/>{p.imageUrl ? <img src={p.imageUrl} className="w-8 h-8 object-cover rounded bg-gray-200"/>:<div className="w-8 h-8 bg-orange-100 rounded border flex items-center justify-center text-[10px]">기본</div>}</td>
                 <td className="p-3">
                   <div className="font-bold text-lg">{p?.name}</div>
                   <div className="text-xs text-indigo-600 bg-indigo-50 inline-block px-1 rounded mb-1">{p?.type}</div>
                   <div className="flex flex-wrap gap-1">{(p?.comorbidities || []).map(c => <span key={c} className="text-[10px] bg-red-50 text-red-600 px-1 border border-red-200 rounded">{c}</span>)}</div>
                 </td>
                 <td className="p-3 text-sm">{p?.gender}/{p?.age}세<br/><span className="text-red-500 font-bold">{p?.initialHba1c}</span> <span className="text-xs">({p?.adherence})</span></td>
                 <td className="p-3 text-sm text-gray-600 max-w-[250px]"><div className="truncate">{p?.desc}</div></td>
                 <td className="p-3 text-right"><button onClick={() => setEditingPatient(p)} className="text-blue-500 p-2"><Edit size={18}/></button><button onClick={() => handleDeletePatient(p.id)} className="text-red-500 p-2"><Trash2 size={18}/></button></td>
               </tr>))}</tbody>
             </table></div>
           </div>
          )}

          {/* ================= PRIZES TAB ================= */}
          {tab === 'prizes' && (
            <div className="animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                <div><h2 className="text-xl font-bold">룰렛 경품 관리</h2><p className={`text-sm mt-1 font-bold ${totalProb !== 100 ? 'text-red-500' : 'text-green-600'}`}>현재 룰렛 확률 합계: {totalProb}%</p></div>
                <button onClick={() => setEditingPrize({ probability: 10 })} className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Plus size={18} /> 새 경품 추가</button>
              </div>
              {editingPrize && (
                <form onSubmit={handleSavePrize} className="flex gap-4 items-end mb-8 p-6 bg-yellow-50 rounded-xl border-2 border-yellow-200">
                  <div className="flex-1"><label className="block text-sm font-bold mb-1">상품명</label><input name="name" defaultValue={editingPrize.name} required className="w-full p-3 border rounded" /></div>
                  <div className="w-32"><label className="block text-sm font-bold mb-1">확률(%)</label><input type="number" name="probability" defaultValue={editingPrize.probability} required className="w-full p-3 border rounded" /></div>
                  <button type="button" onClick={() => setEditingPrize(null)} className="px-5 py-3 bg-gray-300 rounded-lg font-bold">취소</button><button type="submit" className="px-5 py-3 bg-yellow-600 text-white rounded-lg font-bold">저장</button>
                </form>
              )}
              <div className="bg-white border rounded-xl overflow-hidden"><table className="w-full text-left border-collapse"><thead className="bg-gray-50 border-b"><tr><th className="p-4">색상</th><th className="p-4">상품명</th><th className="p-4">확률</th><th className="p-4 text-right">관리</th></tr></thead><tbody>{prizes.map((pz, idx) => (<tr key={pz.id} className="border-b"><td className="p-4"><div className="w-6 h-6 rounded-full border" style={{ backgroundColor: ROULETTE_COLORS[idx % ROULETTE_COLORS.length] }}></div></td><td className="p-4 font-bold"><Gift size={16} className="inline text-yellow-500 mr-2"/> {pz.name}</td><td className="p-4 font-bold text-blue-600">{pz.probability}%</td><td className="p-4 text-right"><button onClick={() => setEditingPrize(pz)} className="text-blue-500 p-2"><Edit size={18}/></button><button onClick={() => handleDeletePrize(pz.id)} className="text-red-500 p-2"><Trash2 size={18}/></button></td></tr>))}</tbody></table></div>
            </div>
          )}

          {/* ================= RECORDS TAB ================= */}
          {tab === 'records' && (
            <div className="animate-fade-in-up">
              <div className="flex justify-between items-center mb-6 border-b pb-4"><h2 className="text-xl font-bold">직원 기록 ({allGameStates.length}명)</h2><button onClick={handleExportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Download size={18} /> 엑셀 다운로드</button></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {allGameStates.map(state => (
                  <div key={state.empId} className="border border-gray-200 p-5 rounded-2xl flex justify-between items-center bg-gray-50 shadow-sm">
                    <div>
                      <div className="font-black text-lg text-indigo-900">{state.empId} 원장</div>
                      <div className="text-sm text-gray-600 mt-2 flex gap-3 font-medium">
                        <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border"><Calendar size={14}/> {state.day}일</span>
                        <span className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-100"><Flame size={14}/> {state.streak}</span>
                        <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100"><Star size={14}/> {state.score}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold mb-4">전체 처방 로그</h3>
                  <div className="overflow-x-auto max-h-[400px] border border-gray-200 rounded-xl shadow-sm custom-scrollbar"><table className="w-full text-left border-collapse text-sm"><thead className="bg-gray-100 sticky top-0"><tr><th className="p-3">일차</th><th className="p-3">사번</th><th className="p-3">환자</th><th className="p-3">처방결과</th><th className="p-3 text-center">관리</th></tr></thead><tbody>{allGameStates.flatMap(s => (s.logs || []).map(l => ({ ...l, empId: s.empId }))).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((log, i) => (<tr key={i} className="border-b"><td className="p-3 text-gray-500">{log.day}일차</td><td className="p-3 font-bold text-indigo-700">{log.empId}</td><td className="p-3 font-medium">{log.patientName}</td><td className="p-3"><span className="text-green-700 font-bold block">{log.drugName}</span><span className="text-xs text-blue-500 font-bold">{log.newHba1c}%</span> {log.patientFeedback && <div className="text-[10px] text-gray-500 max-w-[150px] truncate mt-1">"{log.patientFeedback}"</div>}</td><td className="p-3 text-center"><button onClick={() => handleDeleteLogAdmin(log.empId, log.id, log.patientId, log.day)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16}/></button></td></tr>))}</tbody></table></div>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Gift className="text-yellow-500" /> 경품 당첨 로그</h3>
                  <div className="overflow-x-auto max-h-[400px] border border-yellow-200 rounded-xl shadow-sm custom-scrollbar bg-yellow-50/30"><table className="w-full text-left border-collapse text-sm"><thead className="bg-yellow-100 sticky top-0"><tr><th className="p-3">일차</th><th className="p-3">사번</th><th className="p-3">당첨 상품명</th></tr></thead><tbody>{allGameStates.flatMap(s => (s.prizeLogs || []).map(l => ({ ...l, empId: s.empId }))).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((log, i) => (<tr key={i} className="border-b border-yellow-100"><td className="p-3 text-gray-500 text-xs"><span className="font-bold text-gray-800 block mb-1">{log.day}일차 완료</span>{new Date(log.timestamp).toLocaleString()}</td><td className="p-3 font-bold text-indigo-700">{log.empId}</td><td className="p-3 font-bold text-red-500">{log.prizeName}</td></tr>))}</tbody></table></div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {confirmConfig && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80 text-center animate-fade-in-up">
            <h3 className="text-base font-bold mb-6 text-gray-800 whitespace-pre-wrap leading-relaxed">{confirmConfig.message}</h3>
            <div className="flex gap-3">
              <button onClick={() => setConfirmConfig(null)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300">취소</button>
              <button onClick={confirmConfig.onConfirm} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}