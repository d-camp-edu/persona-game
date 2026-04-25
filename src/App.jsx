import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { Activity, Award, CheckCircle, ChevronRight, ChevronLeft, Edit, Flame, HeartPulse, LogOut, Settings, ShieldAlert, Star, Trash2, User, Users, Pill, Upload, Download, Gift, AlertTriangle, FileText, Copy, GripVertical, Search } from 'lucide-react';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// 🚨 Firebase 경로 오류 방지 (특수문자 제거)
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'persona-diabetes-game';
const appId = rawAppId.replace(/[^a-zA-Z0-9-_]/g, '-');

class ErrorBoundary extends React.Component {
  constructor(props) { 
    super(props); 
    this.state = { hasError: false, error: null }; 
  }
  static getDerivedStateFromError(error) { 
    return { hasError: true, error }; 
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: '#fee', minHeight: '100vh' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>앱 실행 오류</h2>
          <button onClick={() => window.location.reload()} style={{ padding: '10px', marginTop: '10px', background: 'red', color: 'white', borderRadius: '5px' }}>새로고침</button>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '20px', fontSize: '14px' }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// 🚨 브라우저 차단 방지용 안전한 커스텀 팝업
function CustomModal({ config, onClose }) {
  if (!config) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] backdrop-blur-sm px-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center animate-zoom-in">
        <AlertTriangle className={`mx-auto mb-6 ${config.isAlert ? 'text-blue-500' : 'text-red-500'}`} size={56} />
        <h3 className="text-xl font-black mb-8 text-gray-800 whitespace-pre-wrap leading-relaxed">
          {String(config.message)}
        </h3>
        <div className="flex gap-4">
          {!config.isAlert && (
            <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-lg">
              취소
            </button>
          )}
          <button
            onClick={() => { config.onConfirm(); onClose(); }}
            className={`flex-1 py-4 text-white font-bold rounded-xl shadow-md transition-colors text-lg ${config.isAlert ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 기본 데이터 세팅 ---
const _c = (n, g, b) => ({ name: n, goodMsg: g, badMsg: b });
const DEFAULT_COMORBIDITIES = [
  _c('심부전', '숨차는 증상도 덜하고 편안해졌어요.', '숨이 차고 가슴이 답답해요.'),
  _c('만성신장질환(CKD)', '소변 거품도 줄고 붓기도 덜하네요!', '소변 보기가 불편하고 더 붓는 것 같아요.'),
  _c('비만', '체중이 줄어서 몸이 가볍습니다!', '살이 더 찌는 것 같아 걱정이에요.'),
  _c('심혈관', '심장 건강이 좋아진 것 같아 안심입니다.', '심장 쪽이 왠지 모르게 불편합니다.'),
  _c('MASH', '간 수치도 좋아지고 피로감도 덜합니다.', '간 쪽에 무리가 가는 건 아닐지 걱정돼요.'),
  _c('Stroke', '뇌졸중 예방도 된다니 마음이 놓입니다.', '머리 쪽이 가끔 어지러운 것 같아요.'),
  _c('위장장애', '속이 편안해서 다행입니다.', '약 먹고 속이 더부룩하고 소화가 안 돼요.'),
  _c('생식기감염', '특별한 감염 증상 없이 깨끗합니다.', '소변 볼 때 불편하고 가렵습니다.'),
  _c('저혈당', '저혈당 없이 안정적으로 유지되고 있어요.', '가끔 식은땀이 나고 손이 떨려요.'),
  _c('전반적 개선', '전체적인 컨디션이 몰라보게 좋아졌습니다!', '아직 전체적인 컨디션은 잘 모르겠습니다.')
];

const DEFAULT_SETTINGS = {
  loginBgStart: '#6366f1', loginBgEnd: '#9333ea', loginBtnColor: '#6366f1', loginLogoUrl: '', patientsPerDay: 2,
  allowMultipleDaysPerRealDay: true, dashboardBaseImg: '', encounterDoctorImg: '', backgroundImgUrl: '',
  img3: '', img5: '', img10: '', img15: '', img20: '', comorbidities: DEFAULT_COMORBIDITIES,
  initialMetforminThreshold: 6.5, dualTherapyThreshold: 7.5, sglt2EgfrLimit: 25, packagingBonusEffect: 0.3,
  hfLvefMax: 40, hfNyhaMin: 2, hfBnpMin: 35, hfNtprobnpMin: 125, ckdEgfrMin: 20, ckdEgfrMax: 75, ckdUacrMin: 200,
  msgSuccess: "선생님 덕분에 컨디션이 아주 좋습니다! 약이 잘 맞네요.", msgSideEffect: "선생님, 약을 먹고 나서 속이 좀 불편해요.",
  msgPackaging: "병포장이라 약 챙겨 먹기가 훨씬 수월하네요!", msgLifestyle: "추천해주신 대로 생활습관을 바꾸니 몸이 가볍습니다.",
  loginMainTitle: "Persona", loginSubTitle: "당뇨 마스터 20일 시뮬레이션", loginTitleIconUrl: ""
};

const _p = (id, n, a, g, w, bmi, h, t, d, com, lvef, nyha, bnp, nt, eg, ua, pd, pt) => ({
  id: 'p' + id, name: n, age: a, gender: g, weight: w, bmi, initialHba1c: h, type: t, desc: d, comorbidities: com,
  lvef, nyha, bnp, ntprobnp: nt, egfr: eg, uacr: ua, prevDrugs: pd, prevTreatment: pt || '', adherence: '좋음',
  imageUrl: '', order: id, hfHospitalization: false, echoAbnormal: !!lvef, hfStandardTx: true, dipstick: !!ua, ckdStandardTx: true
});

export const DEFAULT_PATIENTS_EXTENDED = [
  _p(1, '김철수', 45, 'M', 82, 26.5, 7.8, '초진', '당뇨라고 해서 왔어요.', ['비만'], 0, 0, 0, 0, 90, 10, ['', '', '', '', ''], ''),
  _p(2, '이영희', 58, 'F', 65, 24.1, 6.8, '재진', '숨이 좀 차고 붓는 느낌이 납니다.', ['심부전'], 35, 2, 50, 150, 65, 50, ['m_1', '', '', '', ''], ''),
  _p(3, '박민수', 62, 'M', 78, 25.4, 8.2, '초진', '소변에 거품이 많고 피곤합니다.', ['만성신장질환(CKD)'], 0, 0, 0, 0, 45, 350, ['', '', '', '', ''], ''),
  _p(4, '정수진', 50, 'F', 60, 23.4, 6.4, '초진', '간수치가 높대요.', ['MASH'], 0, 0, 0, 0, 85, 15, ['', '', '', '', ''], ''),
  _p(5, '강동석', 71, 'M', 85, 28.7, 9.5, '재진', '약을 먹어도 혈당이 잘 안 떨어집니다.', ['심혈관', '비만'], 0, 0, 0, 0, 70, 40, ['m_2', '', '', '', ''], '이전 메트포르민 단독 요법 중'),
  _p(6, '조은지', 38, 'F', 88, 32.0, 7.1, '초진', '살이 너무 쪄서 걱정이에요.', ['비만'], 0, 0, 0, 0, 95, 5, ['', '', '', '', ''], ''),
  _p(7, '윤호영', 65, 'M', 70, 24.8, 6.2, '리핏', '원래 먹던 약 타러 왔습니다.', [], 0, 0, 0, 0, 80, 20, ['m_34', '', '', '', ''], '직두오 유지 중, 혈당 조절 양호'),
  _p(8, '임지연', 55, 'F', 58, 22.6, 8.5, '재진', '신장이 많이 안 좋다고 들었어요.', ['만성신장질환(CKD)'], 0, 0, 0, 0, 20, 450, ['m_5', '', '', '', ''], 'eGFR 20으로 SGLT2i 주의 요망'),
  _p(9, '최병찬', 75, 'M', 68, 23.5, 7.4, '초진', '요즘 기운이 없고 입이 마르네요.', ['심혈관'], 0, 0, 0, 0, 60, 30, ['', '', '', '', ''], ''),
  _p(10, '한소희', 42, 'F', 72, 27.1, 6.3, '초진', '숨이 차고 발목이 자꾸 부어요.', ['심부전', '비만'], 38, 2, 60, 180, 90, 15, ['', '', '', '', ''], '비당뇨 심부전 환자'),
  _p(11, '오지훈', 60, 'M', 80, 25.8, 10.2, '재진', '식단 조절을 잘못했습니다...', [], 0, 0, 0, 0, 85, 20, ['m_15', '', '', '', ''], '자누메트 복용 중, 조절 불량'),
  _p(12, '김미영', 68, 'F', 55, 21.5, 7.9, '재진', '약을 먹으면 가끔 속이 쓰려요.', ['위장장애'], 0, 0, 0, 0, 75, 40, ['m_2', '', '', '', ''], '메트포르민 복용 중 위장장애 호소'),
  _p(13, '황정민', 53, 'M', 90, 30.4, 8.8, '초진', '건강검진에서 다 안 좋게 나왔어요.', ['비만', '만성신장질환(CKD)', 'MASH'], 0, 0, 0, 0, 55, 280, ['', '', '', '', ''], ''),
  _p(14, '신유리', 47, 'F', 62, 24.2, 7.2, '초진', '당뇨 초기라고 약을 먹으라네요.', [], 0, 0, 0, 0, 90, 10, ['', '', '', '', ''], ''),
  _p(15, '장도현', 80, 'M', 65, 22.5, 8.1, '리핏', '다리가 붓고 숨이 찹니다.', ['심부전'], 40, 3, 80, 250, 50, 60, ['m_30', '', '', '', ''], '자디앙듀오 유지 중'),
  _p(16, '류수영', 51, 'F', 77, 29.3, 6.2, '초진', '신장이 안 좋다고 약을 타래요.', ['만성신장질환(CKD)'], 0, 0, 0, 0, 35, 500, ['', '', '', '', ''], '비당뇨 CKD 환자'),
  _p(17, '송우진', 59, 'M', 82, 27.7, 9.0, '재진', '바빠서 약을 잘 못 챙겨 먹었습니다.', ['심혈관'], 0, 0, 0, 0, 80, 25, ['m_21', '', '', '', ''], '순응도 불량, 병포장 약제 고려'),
  _p(18, '배수진', 64, 'F', 59, 23.0, 7.6, '재진', '약을 먹으니 자꾸 방광염이 오네요.', ['생식기감염'], 0, 0, 0, 0, 75, 15, ['m_8', 'm_1', '', '', ''], '포시가 사용 후 감염 발생'),
  _p(19, '곽동수', 72, 'M', 70, 24.5, 11.5, '재진', '약을 여러 개 먹어도 혈당이 11프로가 넘어요.', ['심혈관'], 0, 0, 0, 0, 60, 80, ['m_50', '', '', '', ''], '3제 복합제 사용 중 조절 안됨'),
  _p(20, '차은성', 35, 'M', 105, 34.3, 8.4, '초진', '젊은데 당뇨라니 막막합니다...', ['비만', 'MASH'], 0, 0, 0, 0, 100, 10, ['', '', '', '', ''], '고도비만 동반 당뇨')
];

const DEFAULT_DRUG_CLASSES = [
  { id: 'dc_met', name: 'Biguanide', allowDuplicate: false },
  { id: 'dc_sglt2', name: 'SGLT-2i', allowDuplicate: false },
  { id: 'dc_dpp4', name: 'DPP-4i', allowDuplicate: false },
  { id: 'dc_tzd', name: 'TZD', allowDuplicate: false },
  { id: 'dc_glp1', name: 'GLP-1 RA', allowDuplicate: false },
  { id: 'dc_ins_basal', name: 'Insulin (Basal)', allowDuplicate: false },
  { id: 'dc_ins_premix', name: 'Insulin (Premixed)', allowDuplicate: false },
  { id: 'dc_ins_mdi', name: 'Insulin (MDI)', allowDuplicate: false }
];

const DEFAULT_DEDUCTION_RULES = [
  { id: 'dr_1', classes: ['dc_dpp4', 'dc_glp1'] }
];

const DEFAULT_MED_CATEGORIES = [
  { id: 'cat_1', name: '단일제', order: 1 },
  { id: 'cat_2', name: '메트포르민 2제 복합제', order: 2 },
  { id: 'cat_3', name: '2제 복합제', order: 3 },
  { id: 'cat_4', name: '3제 복합제', order: 4 },
  { id: 'cat_5', name: '주사제', order: 5 },
  { id: 'cat_6', name: '기타/생활습관', order: 6 }
];

// 🚨 약제 속성에 심/신부전 허용을 각각 분리 적용 (hfRed: HFrEF, hfPre: HFpEF, ckd: CKD)
const _m = (id, n, ef, w, l, nt, eg, u, pkg, cat, nd, sep, pen, cls, bc, wc, hfRed, hfPre, ckd, ie, elim, a2tqd) => ({
  id: 'm_' + id, name: n, effect: ef, effectWeight: w, effectLvef: l, effectNtprobnp: nt, effectEgfr: eg, effectUacr: u,
  pkg, categoryId: cat, isNotDrug: !!nd, sideEffectProb: sep, sideEffectPenalty: pen,
  sideEffectMsg: nd ? '' : (wc.includes('위장장애') ? '속이 좀 안 좋고 위장장애가 있어요.' : '불편한 증상이 있습니다.'),
  classes: cls, beneficialComorb: bc, worseningComorb: wc, 
  allowHFrEFCoverage: !!hfRed, allowHFpEFCoverage: !!hfPre, allowCkdCoverage: !!ckd, 
  isInsuranceException: !!ie, egfrLimit: elim || 0, allow2TQD: !!a2tqd, order: id
});

export const DEFAULT_MEDICATIONS = [
  _m(1, '메트포르민 500mg', 0.8, -0.5, 0, 0, 0, 0, 'ptp', 'cat_1', 0, 10, 0.2, ['dc_met'], ['비만', 'MASH'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(2, '메트포르민 1000mg', 1.2, -1, 0, 0, 0, 0, 'ptp', 'cat_1', 0, 20, 0.4, ['dc_met'], ['비만', 'MASH'], ['위장장애', '만성신장질환(CKD)'], 0, 0, 0, 0, 0, 0),
  _m(3, '자누비아 100mg', 0.8, 0, 0, 0, 0, 0, 'ptp', 'cat_1', 0, 3, 0.1, ['dc_dpp4'], [], [], 0, 0, 0, 0, 0, 0),
  _m(4, '제미글로 50mg', 0.8, 0, 0, 0, 0, 0, 'ptp', 'cat_1', 0, 3, 0.1, ['dc_dpp4'], [], [], 0, 0, 0, 0, 0, 0),
  _m(5, '트라젠타 5mg', 0.8, 0, 0, 0, 0, -5, 'ptp', 'cat_1', 0, 2, 0.1, ['dc_dpp4'], ['만성신장질환(CKD)'], [], 0, 0, 0, 0, 0, 0),
  
  // 🚨 다파글리플로진 계열 (트루다파, 포시가, 엑시글루) -> HFrEF, CKD 허용 / eGFR 하한 25
  _m(6, '트루다파 5mg', 0.6, -2, 2, -100, 1, -20, 'ptp', 'cat_1', 0, 6, 0.2, ['dc_sglt2'], ['심부전', '만성신장질환(CKD)'], ['생식기감염'], 1, 0, 1, 0, 25, 0),
  _m(7, '트루다파 10mg', 0.8, -2.5, 3, -150, 2, -30, 'ptp', 'cat_1', 0, 8, 0.3, ['dc_sglt2'], ['심부전', '만성신장질환(CKD)'], ['생식기감염'], 1, 0, 1, 0, 25, 0),
  _m(8, '포시가 10mg', 0.8, -2.5, 3, -150, 2, -30, 'ptp', 'cat_1', 0, 8, 0.3, ['dc_sglt2'], ['심부전', '만성신장질환(CKD)'], ['생식기감염'], 1, 0, 1, 0, 25, 0),
  _m(9, '엑시글루 10mg', 0.8, -2.5, 3, -150, 2, -30, 'ptp', 'cat_1', 0, 8, 0.3, ['dc_sglt2'], ['심부전', '만성신장질환(CKD)'], ['생식기감염'], 1, 0, 1, 0, 25, 0),
  
  // 🚨 엠파글리플로진 계열 (자디앙, 엠파맥스) -> HFrEF, HFpEF, CKD 모두 허용 / eGFR 하한 20
  _m(10, '자디앙 10mg', 0.8, -2, 3, -150, 2, -30, 'ptp', 'cat_1', 0, 8, 0.3, ['dc_sglt2'], ['심부전', '심혈관'], ['생식기감염'], 1, 1, 1, 0, 20, 0),
  _m(11, '자디앙 25mg', 1, -2.5, 4, -180, 3, -35, 'ptp', 'cat_1', 0, 12, 0.4, ['dc_sglt2'], ['심부전', '심혈관'], ['생식기감염'], 0, 0, 0, 0, 20, 0),
  _m(12, '엠파맥스 10mg', 0.8, -2, 3, -150, 2, -30, 'ptp', 'cat_1', 0, 8, 0.3, ['dc_sglt2'], ['심부전', '심혈관'], ['생식기감염'], 1, 1, 1, 0, 20, 0),
  _m(13, '엠파맥스 25mg', 1, -2.5, 4, -180, 3, -35, 'ptp', 'cat_1', 0, 12, 0.4, ['dc_sglt2'], ['심부전', '심혈관'], ['생식기감염'], 0, 0, 0, 0, 20, 0),

  _m(14, '듀비에 0.5mg', 0.9, 1.5, -2, 100, 0, -10, 'ptp', 'cat_1', 0, 10, 0.3, ['dc_tzd'], ['MASH', 'Stroke'], ['심부전', '비만'], 0, 0, 0, 0, 0, 0),
  _m(15, '자누메트 50/1000', 1.6, -1, 0, 0, 0, 0, 'ptp', 'cat_2', 0, 22, 0.5, ['dc_dpp4', 'dc_met'], ['비만'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(16, '자누메트XR 100/1000', 1.8, -1, 0, 0, 0, 0, 'ptp', 'cat_2', 0, 17, 0.3, ['dc_dpp4', 'dc_met'], ['비만'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(17, '제미메트서방정 25/500', 1, -0.5, 0, 0, 0, 0, 'ptp', 'cat_2', 0, 8, 0.2, ['dc_dpp4', 'dc_met'], ['비만'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(18, '제미메트서방정 25/750', 1.2, -0.8, 0, 0, 0, 0, 'ptp', 'cat_2', 0, 10, 0.3, ['dc_dpp4', 'dc_met'], ['비만'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(19, '제미메트서방정 25/1000', 1.4, -1, 0, 0, 0, 0, 'ptp', 'cat_2', 0, 12, 0.3, ['dc_dpp4', 'dc_met'], ['비만'], ['위장장애', '만성신장질환(CKD)'], 0, 0, 0, 0, 0, 0),
  _m(20, '제미메트서방정 50/500', 1.3, -0.5, 0, 0, 0, 0, 'ptp', 'cat_2', 0, 9, 0.2, ['dc_dpp4', 'dc_met'], ['비만'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(21, '제미메트서방정 50/1000', 1.6, -1, 0, 0, 0, 0, 'ptp', 'cat_2', 0, 14, 0.4, ['dc_dpp4', 'dc_met'], ['비만'], ['위장장애', '만성신장질환(CKD)'], 0, 0, 0, 0, 0, 0),
  _m(22, '트라젠타듀오 2.5/500', 1, -0.5, 0, 0, 0, -5, 'ptp', 'cat_2', 0, 11, 0.3, ['dc_dpp4', 'dc_met'], ['만성신장질환(CKD)'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(23, '트라젠타듀오 2.5/850', 1.2, -0.8, 0, 0, 0, -5, 'ptp', 'cat_2', 0, 17, 0.4, ['dc_dpp4', 'dc_met'], ['만성신장질환(CKD)'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(24, '트라젠타듀오 2.5/1000', 1.4, -1, 0, 0, 0, -5, 'ptp', 'cat_2', 0, 20, 0.5, ['dc_dpp4', 'dc_met'], ['만성신장질환(CKD)'], ['위장장애', '만성신장질환(CKD)'], 0, 0, 0, 0, 0, 0),
  
  _m(25, '자디앙듀오 5/500', 1.2, -2.5, 2, -100, 1, -20, 'bottle', 'cat_2', 0, 16, 0.3, ['dc_sglt2', 'dc_met'], ['심부전', '심혈관'], ['위장장애'], 0, 0, 0, 0, 20, 0),
  _m(26, '자디앙듀오 5/850', 1.4, -2.8, 2, -100, 1, -20, 'bottle', 'cat_2', 0, 20, 0.4, ['dc_sglt2', 'dc_met'], ['심부전', '심혈관'], ['위장장애'], 0, 0, 0, 0, 20, 0),
  _m(27, '자디앙듀오 5/1000', 1.5, -3, 2, -100, 1, -20, 'bottle', 'cat_2', 0, 22, 0.5, ['dc_sglt2', 'dc_met'], ['심부전', '심혈관'], ['위장장애'], 0, 0, 0, 0, 20, 0),
  _m(28, '자디앙듀오 12.5/500', 1.5, -2.5, 3, -150, 2, -30, 'bottle', 'cat_2', 0, 18, 0.4, ['dc_sglt2', 'dc_met'], ['심부전', '심혈관'], ['위장장애'], 0, 0, 0, 0, 20, 0),
  _m(29, '자디앙듀오 12.5/850', 1.7, -2.8, 3, -150, 2, -30, 'bottle', 'cat_2', 0, 23, 0.5, ['dc_sglt2', 'dc_met'], ['심부전', '심혈관'], ['위장장애'], 0, 0, 0, 0, 20, 0),
  _m(30, '자디앙듀오 12.5/1000', 1.8, -3, 3, -150, 2, -30, 'bottle', 'cat_2', 0, 25, 0.6, ['dc_sglt2', 'dc_met'], ['심부전', '심혈관'], ['위장장애'], 0, 0, 0, 0, 20, 0),
  
  _m(31, '직두오서방정 5/500', 1.2, -2, 2, -100, 1, -20, 'ptp', 'cat_2', 0, 12, 0.3, ['dc_sglt2', 'dc_met'], ['심부전', '만성신장질환(CKD)'], ['위장장애'], 0, 0, 0, 0, 25, 1),
  _m(32, '직두오서방정 5/1000', 1.5, -2.5, 2, -100, 1, -20, 'ptp', 'cat_2', 0, 15, 0.4, ['dc_sglt2', 'dc_met'], ['심부전', '만성신장질환(CKD)'], ['위장장애'], 0, 0, 0, 0, 25, 0),
  _m(33, '직두오서방정 10/500', 1.5, -2.5, 3, -150, 2, -30, 'ptp', 'cat_2', 0, 14, 0.4, ['dc_sglt2', 'dc_met'], ['심부전', '만성신장질환(CKD)'], ['위장장애'], 0, 0, 0, 0, 25, 1),
  _m(34, '직두오서방정 10/1000', 1.8, -3, 3, -150, 2, -30, 'ptp', 'cat_2', 0, 18, 0.4, ['dc_sglt2', 'dc_met'], ['심부전', '만성신장질환(CKD)'], ['위장장애'], 0, 0, 0, 0, 25, 0),
  _m(35, '엑시글루M 10/1000', 1.8, -3.5, 3, -150, 2, -30, 'ptp', 'cat_2', 0, 25, 0.6, ['dc_sglt2', 'dc_met'], ['심부전', '만성신장질환(CKD)'], ['위장장애'], 0, 0, 0, 0, 25, 0),
  _m(36, '엑시글루S 10/100', 1.5, -2.5, 3, -150, 2, -30, 'ptp', 'cat_3', 0, 10, 0.3, ['dc_sglt2', 'dc_dpp4'], ['심부전', '만성신장질환(CKD)'], ['생식기감염'], 0, 0, 0, 0, 25, 0),
  
  _m(37, '엠파맥스M 12.5/1000', 1.8, -3, 3, -150, 2, -30, 'bottle', 'cat_2', 0, 25, 0.6, ['dc_sglt2', 'dc_met'], ['심부전', '심혈관'], ['위장장애'], 0, 0, 0, 0, 20, 0),
  _m(38, '엠파맥스M XR 25/1000', 2, -3.5, 4, -180, 3, -35, 'bottle', 'cat_2', 0, 21, 0.5, ['dc_sglt2', 'dc_met'], ['심부전', '심혈관'], ['위장장애'], 0, 0, 0, 0, 20, 0),
  _m(39, '엠파맥스S 10/100', 1.5, -2, 3, -150, 2, -30, 'ptp', 'cat_3', 0, 10, 0.3, ['dc_sglt2', 'dc_dpp4'], ['심부전', '심혈관'], ['생식기감염'], 0, 0, 0, 0, 20, 0),
  _m(40, '엠파맥스S 25/100', 1.7, -2.5, 4, -180, 3, -35, 'ptp', 'cat_3', 0, 14, 0.4, ['dc_sglt2', 'dc_dpp4'], ['심부전', '심혈관'], ['생식기감염'], 0, 0, 0, 0, 20, 0),
  _m(41, '에스글리토 10/5', 1.4, -2, 3, -150, 2, -30, 'ptp', 'cat_3', 0, 10, 0.3, ['dc_sglt2', 'dc_dpp4'], ['심부전', '심혈관'], ['생식기감염'], 0, 0, 0, 0, 20, 0),
  _m(42, '에스글리토 25/5', 1.6, -2.5, 4, -180, 3, -35, 'ptp', 'cat_3', 0, 14, 0.4, ['dc_sglt2', 'dc_dpp4'], ['심부전', '심혈관'], ['생식기감염'], 0, 0, 0, 0, 20, 0),
  
  _m(43, '듀비메트서방정 0.25/500', 1.3, 0.2, -1, 50, 0, -5, 'ptp', 'cat_2', 0, 8, 0.2, ['dc_tzd', 'dc_met'], ['MASH'], ['위장장애'], 0, 0, 0, 0, 0, 1),
  _m(44, '듀비메트서방정 0.25/750', 1.5, 0, -1, 50, 0, -5, 'ptp', 'cat_2', 0, 10, 0.3, ['dc_tzd', 'dc_met'], ['MASH'], ['위장장애'], 0, 0, 0, 0, 0, 1),
  _m(45, '듀비메트서방정 0.25/1000', 1.7, -0.3, -1, 50, 0, -5, 'ptp', 'cat_2', 0, 13, 0.4, ['dc_tzd', 'dc_met'], ['MASH'], ['위장장애'], 0, 0, 0, 0, 0, 1),
  _m(46, '듀비메트서방정 0.5/1000', 1.9, 0.5, -2, 100, 0, -10, 'ptp', 'cat_2', 0, 20, 0.6, ['dc_tzd', 'dc_met'], ['MASH'], ['심부전', '위장장애'], 0, 0, 0, 0, 0, 0),
  _m(47, '듀비에S 0.5/100', 1.5, 1.5, -2, 100, 0, -15, 'ptp', 'cat_3', 0, 12, 0.4, ['dc_tzd', 'dc_dpp4'], ['MASH', 'Stroke'], ['심부전', '비만'], 0, 0, 0, 0, 0, 0),
  
  _m(48, '실다파엠서방정 5/50/500', 1.4, -1.5, 2, -100, 1, -20, 'ptp', 'cat_4', 0, 14, 0.3, ['dc_sglt2', 'dc_dpp4', 'dc_met'], ['심부전', '만성신장질환(CKD)', '비만'], ['위장장애'], 0, 0, 0, 0, 25, 1),
  _m(49, '실다파엠서방정 5/50/750', 1.6, -2, 2, -100, 1, -20, 'ptp', 'cat_4', 0, 17, 0.4, ['dc_sglt2', 'dc_dpp4', 'dc_met'], ['심부전', '만성신장질환(CKD)', '비만'], ['위장장애'], 0, 0, 0, 0, 25, 1),
  _m(50, '실다파엠서방정 5/50/1000', 1.8, -2.5, 2, -100, 1, -20, 'ptp', 'cat_4', 0, 20, 0.5, ['dc_sglt2', 'dc_dpp4', 'dc_met'], ['심부전', '만성신장질환(CKD)', '비만'], ['위장장애'], 0, 0, 0, 0, 25, 0),
  _m(51, '엠시타민 12.5/50/750', 1.9, -2.5, 3, -150, 2, -30, 'ptp', 'cat_4', 0, 25, 0.7, ['dc_sglt2', 'dc_dpp4', 'dc_met'], ['심부전', '만성신장질환(CKD)', '비만'], ['위장장애'], 0, 0, 0, 0, 20, 1),
  _m(52, '엠시타민 25/100/1000', 2.4, -3.5, 4, -180, 3, -35, 'ptp', 'cat_4', 0, 35, 1.0, ['dc_sglt2', 'dc_dpp4', 'dc_met'], ['심부전', '만성신장질환(CKD)', '비만'], ['위장장애'], 0, 0, 0, 0, 20, 0),
  
  _m(53, '오젬픽 0.25mg', 1, -2, 1, -50, 0, -15, 'injection', 'cat_5', 0, 20, 0.5, ['dc_glp1'], ['비만', '심혈관'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(54, '오젬픽 0.5mg', 1.4, -3.5, 1, -50, 0, -15, 'injection', 'cat_5', 0, 30, 0.8, ['dc_glp1'], ['비만', '심혈관'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(55, '오젬픽 1.0mg', 1.8, -5, 2, -80, 0, -20, 'injection', 'cat_5', 0, 40, 1.2, ['dc_glp1'], ['비만', '심혈관'], ['위장장애'], 0, 0, 0, 0, 0, 0),
  _m(56, '인슐린 기저요법(시작 용량)', 1.2, 1, 0, 0, 0, 0, 'injection', 'cat_5', 0, 10, 0.5, ['dc_ins_basal'], ['전반적 개선'], ['비만', '저혈당'], 0, 0, 0, 0, 0, 0),
  _m(57, '인슐린 기저요법(고용량)', 1.8, 2, 0, 0, 0, 0, 'injection', 'cat_5', 0, 18, 1.0, ['dc_ins_basal'], ['전반적 개선'], ['비만', '저혈당'], 0, 0, 0, 0, 0, 0),
  _m(58, '인슐린 혼합형(프리믹스)', 2.2, 2.5, 0, 0, 0, 0, 'injection', 'cat_5', 0, 25, 1.5, ['dc_ins_premix'], ['전반적 개선'], ['비만', '저혈당'], 0, 0, 0, 0, 0, 0),
  _m(59, '인슐린 다회요법(초속효성)', 3, 3, 0, 0, 0, 0, 'injection', 'cat_5', 0, 35, 2.0, ['dc_ins_mdi'], ['전반적 개선'], ['비만', '저혈당'], 0, 0, 0, 0, 0, 0),
  _m(60, '생활습관 교정 (운동/식단)', 0.3, -1, 0, 0, 0, 0, 'ptp', 'cat_6', 1, 0, 0, [], [], [], 1, 1, 0, 0, 0, 0)
];

// 🚨 사다리 상품 기본 세팅 (스크린샷 일치)
const DEFAULT_PRIZES = [
  { id: 'pz1', name: '쿠팡 기프트 카드(1만원)', probability: 2.0 },
  { id: 'pz2', name: '상품권 5만원', probability: 0.2 },
  { id: 'pz3', name: '치킨 기프티콘', probability: 1.0 },
  { id: 'pz4', name: '스타벅스 아메리카노', probability: 4.0 },
  { id: 'pz5', name: '꽝 (다음 기회에)', probability: 92.8 }
];

const processImageFile = (file, callback, maxWidth = 300) => {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let scaleSize = 1;
      if (img.width > maxWidth) scaleSize = maxWidth / img.width;
      canvas.width = img.width * scaleSize;
      canvas.height = img.height * scaleSize;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/webp', 0.8));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
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

// 🚨 Base(초기) 혈당 유지 로직 (재진 환자용)
const getPatientCurrentState = (patient, logs, medications) => {
  const pastLogs = (logs || []).filter(l => l.patientId === patient.id).sort((a, b) => b.day - a.day);
  if (pastLogs.length === 0) {
    let drop = 0;
    (patient.prevDrugs || []).forEach(dId => {
      const m = (medications || []).find(x => x.id === dId);
      if (m && !m.isNotDrug) drop += Number(m.effect) || 0;
    });
    let c = Number(patient.initialHba1c) - drop;
    return {
      ...patient,
      currentHba1c: Math.max(4.5, c).toFixed(1),
      currentWeight: patient.weight,
      currentLvef: patient.lvef,
      currentNyha: patient.nyha,
      currentBnp: patient.bnp,
      currentNtprobnp: patient.ntprobnp,
      currentEgfr: patient.egfr,
      currentUacr: patient.uacr
    };
  }
  const lastLog = pastLogs[0];
  return {
    ...patient,
    currentHba1c: Number(lastLog.newHba1c).toFixed(1),
    currentWeight: lastLog.newWeight ?? patient.weight,
    currentLvef: lastLog.newLvef ?? patient.lvef,
    currentNyha: lastLog.newNyha ?? patient.nyha,
    currentBnp: lastLog.newBnp ?? patient.bnp,
    currentNtprobnp: lastLog.newNtprobnp ?? patient.ntprobnp,
    currentEgfr: lastLog.newEgfr ?? patient.egfr,
    currentUacr: lastLog.newUacr ?? patient.uacr
  };
};

function PrizeManager({ prizes, db, appId, customConfirm, customAlert }) {
  const [localPrizes, setLocalPrizes] = useState([]);

  useEffect(() => {
    if (prizes && (localPrizes.length === 0 || localPrizes.length !== prizes.length)) {
      setLocalPrizes(prizes);
    }
  }, [prizes]);

  const handleChange = (index, field, val) => {
    let next = localPrizes.map(p => ({ ...p }));
    if (field === 'name') {
      next[index].name = val;
    } else if (field === 'probability') {
      let n = Math.max(0, Math.min(100, Number(val)));
      next[index].probability = n;
      let rem = 100 - n;
      let others = next.filter((_, i) => i !== index);
      let oTotal = others.reduce((s, p) => s + p.probability, 0);

      if (others.length > 0) {
        if (oTotal === 0) {
          others.forEach(p => p.probability = Number((rem / others.length).toFixed(1)));
        } else {
          others.forEach(p => p.probability = Number(((p.probability / oTotal) * rem).toFixed(1)));
        }
        let diff = Number((rem - others.reduce((sum, p) => sum + p.probability, 0)).toFixed(1));
        if (Math.abs(diff) > 0) {
          others[others.length - 1].probability = Number((others[others.length - 1].probability + diff).toFixed(1));
        }
      }
      let map = new Map(others.map(o => [o.id, o.probability]));
      next = next.map(p => p.id === next[index].id ? p : { ...p, probability: map.get(p.id) });
    }
    setLocalPrizes(next);
  };

  const handleSaveAll = async () => {
    try {
      for (const p of localPrizes) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prizes', p.id), p, { merge: true });
      }
      customAlert('확률 및 경품이 저장되었습니다.');
    } catch (e) {
      console.error(e);
      customAlert('저장 실패: ' + e.message);
    }
  };

  const handleAdd = async () => {
    const newId = `pz_${Date.now()}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prizes', newId), { id: newId, name: '새 경품', probability: 0 });
  };

  const handleDel = (id) => {
    customConfirm('삭제하시겠습니까?', async () => {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prizes', id));
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-xl">사다리 경품 목록 (총합 100% 자동 조절)</h2>
        <button onClick={handleAdd} className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold shadow-md hover:bg-yellow-600">+ 새 경품</button>
      </div>
      <div className="bg-yellow-50 p-6 rounded-2xl shadow-inner space-y-3 border border-yellow-100">
        {localPrizes.map((pz, i) => (
          <div key={pz.id} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-yellow-200">
            <Gift className="text-yellow-500 shrink-0" size={24} />
            <input value={pz.name || ''} onChange={(e) => handleChange(i, 'name', e.target.value)} className="flex-[2] p-2 border rounded font-bold focus:border-yellow-400 focus:outline-none" placeholder="상품명" />
            <div className="flex-[1] flex items-center gap-2">
              <input type="number" step="0.1" value={pz.probability || 0} onChange={(e) => handleChange(i, 'probability', e.target.value)} className="w-full p-2 border rounded font-bold text-blue-600 text-center focus:border-blue-400 focus:outline-none" />
              <span className="font-bold text-gray-500">%</span>
            </div>
            <button onClick={() => handleDel(pz.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
          </div>
        ))}
        {localPrizes.length === 0 && <p className="text-center text-gray-500 py-4 font-bold">등록된 경품이 없습니다.</p>}
        <button onClick={handleSaveAll} className="w-full mt-4 py-4 bg-yellow-600 text-white font-bold rounded-xl shadow-md hover:bg-yellow-700 transition-colors text-lg">전체 경품 및 확률 저장하기</button>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [patients, setPatients] = useState([]);
  const [medications, setMedications] = useState([]);
  const [drugClasses, setDrugClasses] = useState([]);
  const [medCategories, setMedCategories] = useState([]);
  const [deductionRules, setDeductionRules] = useState([]);
  const [allowedCombinations, setAllowedCombinations] = useState([]);
  const [sideEffectExemptions, setSideEffectExemptions] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [allGameStates, setAllGameStates] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(DEFAULT_SETTINGS);

  const [currentEmpId, setCurrentEmpId] = useState('');
  const [view, setView] = useState('login');
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const comorbidityList = useMemo(() => Array.isArray(globalSettings?.comorbidities) ? globalSettings.comorbidities : DEFAULT_COMORBIDITIES, [globalSettings?.comorbidities]);

  useEffect(() => {
    const l = document.createElement('link');
    l.href = 'https://cdn.jsdelivr.net/gh/neodgm/neodgm-webfont@latest/neodgm/style.css';
    l.rel = 'stylesheet';
    document.head.appendChild(l);
    return () => document.head.removeChild(l);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            console.error("Auth token failed, falling back to anonymous:", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Auth error:", e);
      }
    };
    initAuth();
    const un = onAuthStateChanged(auth, u => { setUser(u); setAuthChecked(true); });
    return () => un();
  }, []);

  useEffect(() => {
    if (!authChecked || !user) return;

    const setupCol = (path, setter, defaults = []) => {
      return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', path), snap => {
        let d = snap.docs.map(x => ({ ...x.data(), id: x.id }));
        if (d.length === 0 && defaults.length > 0) {
          defaults.forEach(async x => await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', path), x.id), x));
        } else {
          if (['patients', 'medications', 'medCategories'].includes(path)) {
            d.sort((a, b) => (a.order || 0) - (b.order || 0));
          }
          setter(d);
        }
      });
    };

    const unsubP = setupCol('patients', setPatients, []);
    const unsubM = setupCol('medications', setMedications, []);
    const unsubDC = setupCol('drugClasses', setDrugClasses, DEFAULT_DRUG_CLASSES);
    const unsubMC = setupCol('medCategories', setMedCategories, DEFAULT_MED_CATEGORIES);
    const unsubDR = setupCol('deductionRules', setDeductionRules, DEFAULT_DEDUCTION_RULES);
    const unsubAC = setupCol('allowedCombinations', setAllowedCombinations, []);
    const unsubSEE = setupCol('sideEffectExemptions', setSideEffectExemptions, []);
    const unsubPz = setupCol('prizes', setPrizes, DEFAULT_PRIZES);
    const unsubGs = setupCol('gamestates', setAllGameStates, []);

    const unsubSet = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), snap => {
      if (snap.exists()) setGlobalSettings({ ...DEFAULT_SETTINGS, ...snap.data() });
      setSettingsLoaded(true);
    });

    return () => { unsubP(); unsubM(); unsubDC(); unsubMC(); unsubDR(); unsubAC(); unsubSEE(); unsubPz(); unsubGs(); unsubSet(); };
  }, [authChecked, user]);

  const myState = useMemo(() => (allGameStates || []).find(s => s.empId === currentEmpId) || null, [allGameStates, currentEmpId]);
  const currentPatient = useMemo(() => (patients || []).find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleLogin = async (id) => {
    if (!id.trim()) return;
    setCurrentEmpId(id);
    setView('dashboard');
    if (!(allGameStates || []).find(s => s.empId === id)) {
      try {
        await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'gamestates')), {
          empId: id, day: 1, score: 0, streak: 1, logs: [], prizeLogs: [], completedToday: [], penalizedPatientIds: [], deductionLogs: []
        });
      } catch (e) { console.error(e); }
    }
  };

  const handleLogout = () => { setCurrentEmpId(''); setView('login'); };

  if (!authChecked || !settingsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${globalSettings?.loginBgStart || '#6366f1'}, ${globalSettings?.loginBgEnd || '#9333ea'})` }}>
        <div className="animate-pulse text-white font-black text-2xl drop-shadow-md">데이터 동기화 중...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-indigo-200">
        {view === 'login' && <LoginScreen onLogin={handleLogin} onAdminAccess={() => setView('admin')} settings={globalSettings} />}
        {view === 'admin' && <AdminScreen patients={patients} medications={medications} drugClasses={drugClasses} medCategories={medCategories} deductionRules={deductionRules} allowedCombinations={allowedCombinations} sideEffectExemptions={sideEffectExemptions} prizes={prizes} allGameStates={allGameStates} globalSettings={globalSettings} comorbidityList={comorbidityList} onLogout={handleLogout} db={db} appId={appId} />}
        {view === 'dashboard' && !myState && <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}
        {view === 'dashboard' && myState && myState.day <= 20 && <DashboardScreen state={myState} patients={patients} medications={medications} prizes={prizes} drugClasses={drugClasses} deductionRules={deductionRules} allowedCombinations={allowedCombinations} globalSettings={globalSettings} onStartEncounter={id => { setSelectedPatientId(id); setView('encounter'); }} onLogout={handleLogout} db={db} appId={appId} />}
        {view === 'dashboard' && myState && myState.day > 20 && <EndingScreen state={myState} patients={patients} onLogout={handleLogout} />}
        {view === 'encounter' && myState && currentPatient && <EncounterScreen state={myState} patient={currentPatient} medications={medications} medCategories={medCategories} globalSettings={globalSettings} comorbidityList={comorbidityList} drugClasses={drugClasses} sideEffectExemptions={sideEffectExemptions} onComplete={() => { setSelectedPatientId(null); setView('dashboard'); }} db={db} appId={appId} />}
      </div>
    </ErrorBoundary>
  );
}

function LoginScreen({ onLogin, onAdminAccess, settings }) {
  const [i, setI] = useState('');
  const [sA, setSA] = useState(false);
  const [pw, setPw] = useState('');
  const [eM, setEM] = useState('');

  const hS = e => {
    e.preventDefault();
    if (pw === '1024') onAdminAccess(); else setEM('비밀번호 오류');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative" style={{ background: `linear-gradient(to bottom right, ${settings?.loginBgStart || '#6366f1'}, ${settings?.loginBgEnd || '#9333ea'})` }}>
      <div className="absolute top-4 left-4 text-white/50 font-bold text-sm tracking-widest">v3.17</div>
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center relative z-10 transition-transform hover:scale-[1.02] duration-300">
        <div className="flex justify-center mb-6">
          {settings?.loginLogoUrl ? <img src={settings.loginLogoUrl} className="h-24 object-contain" /> : <div className="bg-indigo-100 p-4 rounded-full border-4 border-indigo-200"><HeartPulse size={48} className="text-indigo-600" /></div>}
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">{settings?.loginMainTitle || 'Persona'}</h1>
          {settings?.loginTitleIconUrl ? <img src={settings.loginTitleIconUrl} className="h-8 w-8 object-contain" /> : <span className="text-3xl">🎭</span>}
        </div>
        <p className="text-gray-500 mb-8 font-medium">{settings?.loginSubTitle || '당뇨 마스터 20일 시뮬레이션'}</p>
        <input type="text" placeholder="사번을 입력하세요" className="w-full px-4 py-4 rounded-2xl bg-gray-100 border-2 focus:border-indigo-400 focus:bg-white focus:outline-none text-center font-bold text-lg mb-4" value={i} onChange={e => setI(e.target.value)} onKeyDown={e => e.key === 'Enter' && onLogin(i)} />
        <button onClick={() => onLogin(i)} style={{ backgroundColor: settings?.loginBtnColor || '#6366f1' }} className="w-full text-white font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-2 shadow-md active:scale-95">
          진료 시작하기 <ChevronRight size={24} />
        </button>
      </div>
      <button onClick={() => setSA(true)} className="absolute bottom-6 right-6 p-3 text-white/50 hover:text-white rounded-full"><Settings size={24} /></button>

      {sA && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-xs text-center animate-fade-in-up">
            <h2 className="text-xl font-bold mb-4 flex justify-center items-center gap-2"><ShieldAlert className="text-red-500" /> 관리자 콘솔</h2>
            <form onSubmit={hS}>
              <input type="password" placeholder="비밀번호" className="w-full px-4 py-3 rounded-xl bg-gray-100 border-2 focus:border-red-400 focus:outline-none mb-2 text-center text-lg tracking-widest" value={pw} onChange={e => { setPw(e.target.value); setEM(''); }} autoFocus />
              {eM && <p className="text-red-500 text-sm font-bold mb-4">{eM}</p>}
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => { setSA(false); setPw(''); setEM(''); }} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl">취소</button>
                <button type="submit" className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl">접속</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function EndingScreen({ state, patients, onLogout }) {
  const patientData = useMemo(() => {
    const d = {};
    (state.logs || []).forEach(log => {
      if (!d[log.patientId]) {
        const pt = patients.find(x => x.id === log.patientId);
        let mt = 'HbA1c', un = '%';
        let isND = pt && Number(pt.initialHba1c) < 6.5;
        if (isND) {
          if (pt.comorbidities?.includes('만성신장질환(CKD)')) { mt = 'UACR'; un = 'mg/g'; }
          else if (pt.comorbidities?.includes('심부전')) { mt = 'LVEF'; un = '%'; }
        }
        d[log.patientId] = { name: log.patientName, history: [], metric: mt, unit: un };
        if (pt) {
          let iv = pt.initialHba1c;
          if (mt === 'UACR') iv = pt.uacr;
          if (mt === 'LVEF') iv = pt.lvef;
          d[log.patientId].history.push({ day: 0, val: Number(iv) || 0 });
        }
      }
      let v = log.newHba1c;
      if (d[log.patientId].metric === 'UACR') v = log.newUacr;
      if (d[log.patientId].metric === 'LVEF') v = log.newLvef;
      d[log.patientId].history.push({ day: log.day, val: Number(v) || 0 });
    });
    return Object.values(d);
  }, [state.logs, patients]);

  const LineChart = ({ data, color, unit }) => {
    const vals = data.map(x => x.val);
    const mi = Math.min(...vals) * 0.95;
    const ma = Math.max(...vals) * 1.05;
    const sX = x => (x / 20) * 280 + 10;
    const sY = y => 140 - ((y - mi) / (ma - mi || 1)) * 120 + 10;
    
    return (
      <svg width="300" height="170" className="bg-black/20 rounded-xl mt-2 mx-auto shadow-inner overflow-visible">
        <polyline fill="none" stroke={color} strokeWidth="3" points={data.sort((a, b) => a.day - b.day).map(x => `${sX(x.day)},${sY(x.val)}`).join(' ')} className="drop-shadow-md" />
        {data.map((x, i) => (
          <g key={i}>
            <circle cx={sX(x.day)} cy={sY(x.val)} r="4" fill={color} />
            <text x={sX(x.day)} y={sY(x.val) - 10} fill="white" fontSize="10" textAnchor="middle" fontWeight="bold">{x.val}{unit}</text>
            <text x={sX(x.day)} y={160} fill="rgba(255,255,255,0.7)" fontSize="9" textAnchor="middle">{x.day === 0 ? '초기' : `${x.day}일`}</text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-start p-6 text-white text-center custom-scrollbar" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7e22ce 100%)' }}>
      <div className="absolute top-6 right-6"><button onClick={onLogout} className="text-white/70 hover:text-white"><LogOut size={28} /></button></div>
      <div className="mt-12 mb-8">
        <Award size={80} className="mx-auto text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.6)] animate-bounce mb-4" />
        <h1 className="text-4xl font-black mb-2">수고하셨습니다!</h1>
        <p className="text-lg opacity-90">당뇨 마스터 20일 시뮬레이션 완수</p>
      </div>
      <div className="bg-white/10 p-6 rounded-3xl w-full max-w-xl mb-8">
        <p className="text-sm font-bold opacity-80 mb-2">최종 누적 점수</p>
        <p className="text-5xl font-black text-yellow-300">{state.score}<span className="text-xl ml-1">점</span></p>
      </div>
      <div className="w-full max-w-xl bg-white/10 p-6 rounded-3xl mb-12 text-left">
        <h3 className="text-lg font-bold mb-4 border-b border-white/20 pb-2 flex gap-2"><Activity size={20} /> 환자별 변화 추이</h3>
        <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {patientData.map((pt, i) => (
            <div key={i}>
              <p className="font-bold text-yellow-300 mb-1">{pt.name} 환자 <span className="text-xs text-white/70 ml-2">({pt.metric})</span></p>
              <LineChart data={pt.history} color="#FDE047" unit={pt.unit} />
            </div>
          ))}
        </div>
      </div>
      <button onClick={onLogout} className="w-full max-w-md py-5 bg-white text-indigo-700 font-black rounded-2xl shadow-xl active:scale-95 text-xl mb-12">처음으로 돌아가기</button>
    </div>
  );
}

function DashboardScreen({ state, patients, medications, prizes, drugClasses, deductionRules, allowedCombinations, globalSettings, onStartEncounter, onLogout, db, appId }) {
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [deductions, setDeductions] = useState([]);
  const [showLadder, setShowLadder] = useState(false);
  const [ladderPhase, setLadderPhase] = useState('idle');
  const [wonPrize, setWonPrize] = useState(null);
  const [bottomPrizes, setBottomPrizes] = useState([null, null, null]);
  const [selectedCol, setSelectedCol] = useState(null);
  const canvasRef = useRef(null);

  const customConfirm = (msg, onConfirm, isAlert = false) => setConfirmConfig({ message: String(msg), onConfirm: onConfirm, isAlert: isAlert });

  const isLockedOut = globalSettings?.allowMultipleDaysPerRealDay === false && state?.lastCompletedDate === new Date().toDateString();
  
  const todaysPatients = useMemo(() => {
    if (!patients || patients.length === 0) return [];
    const ppd = Math.max(1, Number(globalSettings?.patientsPerDay) || 2);
    const sI = ((Number(state?.day || 1) - 1) * ppd) % patients.length;
    const l = [];
    for (let i = 0; i < ppd; i++) {
      const pt = patients[(sI + i) % patients.length];
      if (pt && !l.find(x => x.id === pt.id)) l.push(pt);
    }
    return l;
  }, [patients, state?.day, globalSettings?.patientsPerDay]);

  const completedList = state?.completedToday || [];
  const remainingToday = todaysPatients.filter(pt => pt && !completedList.includes(pt.id));
  const isAllCompleted = patients.length > 0 && todaysPatients.length > 0 && remainingToday.length === 0;
  const progressPercent = todaysPatients.length > 0 ? ((todaysPatients.length - remainingToday.length) / todaysPatients.length) * 100 : 0;
  const profileImg = getDashboardProfileImage(state?.streak || 0, globalSettings);

  const evaluateDeductions = async () => {
    try {
      const msgs = [];
      const patientErrors = {}; 

      (state.logs || []).filter(l => l.day === state.day).forEach(log => {
        const pt = patients.find(x => x.id === log.patientId);
        const cv = (log.prescribedDrugs || []).filter(d => !d.isSelfPay).map(d => {
          const f = (medications || []).find(x => x.id === d.id);
          return f ? { ...f, ...d } : d;
        });
        const md = cv.filter(d => !d.isInsuranceException && !d.isNotDrug);

        const errs = [];

        // 2T QD 중복 체크 우회 로직
        const cCnt = {}; const p2 = {};
        md.forEach(d => {
          if (d.allow2TQD) {
            p2[d.id] = (p2[d.id] || 0) + 1;
            if (p2[d.id] <= 2) {
              if (p2[d.id] === 1) (d.classes || []).forEach(c => cCnt[c] = (cCnt[c] || 0) + 1);
            } else {
              (d.classes || []).forEach(c => cCnt[c] = (cCnt[c] || 0) + 1);
            }
          } else {
            (d.classes || []).forEach(c => cCnt[c] = (cCnt[c] || 0) + 1);
          }
        });
        
        Object.keys(cCnt).forEach(id => {
          if (cCnt[id] > 1) {
            const o = (drugClasses || []).find(x => x.id === id);
            if (o && !o.allowDuplicate) errs.push(`급여 칸 ${o.name} 중복 삭감!`);
          }
        });

        const uTC = Object.keys(cCnt);
        const iCA = (allowedCombinations || []).some(ac => ac.classes.length === uTC.length && ac.classes.every(x => uTC.includes(x)));
        if (!iCA) {
          (deductionRules || []).forEach(r => {
            if (r.classes.length === 1 && uTC.length === 1 && uTC.includes(r.classes[0])) errs.push(`단독 처방 금기 삭감!`);
            else if (r.classes.length > 1 && r.classes.every(rc => uTC.includes(rc))) errs.push(`병용 금기 삭감!`);
          });
        }

        const pLg = (state.logs || []).filter(l => l.patientId === pt?.id && l.day < log.day).sort((a, b) => b.day - a.day);
        const iIT = (log.patientType === '초진' && pLg.length === 0);
        const aB = Number(pt?.initialHba1c); 
        const iND = aB < 6.5;

        let cEg = Number(pt?.egfr) || 0;
        if (pLg.length > 0 && pLg[0].newEgfr) cEg = Number(pLg[0].newEgfr);

        // 🚨 보험 상병코드 최우선 적용 시스템
        const cd = log.insuranceCodes || [];
        const hE = cd.includes('E11'), hI = cd.includes('I50'), hN = cd.includes('N18');
        const vHF = hI && (pt?.comorbidities || []).includes('심부전');
        const vCKD = hN && (pt?.comorbidities || []).includes('만성신장질환(CKD)');

        if (md.length > 0) {
          if (cd.length === 0) errs.push(`처방 상병코드(보험코드) 누락 삭감!`);
          if (hI && !vHF) errs.push(`심부전(I50) 보험 특례 기준 미달 삭감!`);
          if (hN && !vCKD) errs.push(`만성신장질환(N18) 특례 미달 삭감!`);

          let e11D = [];
          md.forEach(d => {
            // 1. eGFR 허가하한선 (최우선 절대 금기)
            if (d.egfrLimit > 0 && cEg > 0 && cEg < Number(d.egfrLimit)) {
              errs.push(`${d.name}은(는) 허가기준(eGFR ${d.egfrLimit}) 미달로 절대 처방 금기 삭감!`);
              return; 
            }

            // 2. 비당뇨 특례 적용 확인
            const iS = (d.classes || []).some(cl => {
                const dcObj = (drugClasses || []).find(x => x.id === cl);
                return dcObj?.name?.toUpperCase().includes('SGLT');
            });

            let iED = false;
            let exceptionMsg = null;

            if (iS) {
                const lvefThreshold = Number(globalSettings?.hfLvefMax) || 40;
                const isHFrEF = vHF && (Number(pt?.lvef) < lvefThreshold);
                const isHFpEF = vHF && (Number(pt?.lvef) >= lvefThreshold);

                if (vHF && isHFrEF && d.allowHFrEFCoverage) {
                    if (Number(pt?.nyha) < (Number(globalSettings?.hfNyhaMin) || 2)) exceptionMsg = `심부전(HFrEF) 특례 기준(NYHA ${globalSettings?.hfNyhaMin || 2} 이상) 미달!`;
                    else iED = true;
                } else if (vHF && isHFpEF && d.allowHFpEFCoverage) {
                    if (Number(pt?.nyha) < (Number(globalSettings?.hfNyhaMin) || 2)) exceptionMsg = `심부전(HFpEF) 특례 기준(NYHA ${globalSettings?.hfNyhaMin || 2} 이상) 미달!`;
                    else if (Number(pt?.bnp) < (Number(globalSettings?.hfBnpMin) || 35) && Number(pt?.ntprobnp) < (Number(globalSettings?.hfNtprobnpMin) || 125)) exceptionMsg = `심부전(HFpEF) 특례 기준(BNP 또는 NT-proBNP) 미달!`;
                    else iED = true;
                } else if (vCKD && d.allowCkdCoverage) {
                    if (cEg < (Number(globalSettings?.ckdEgfrMin) || 20) || cEg > (Number(globalSettings?.ckdEgfrMax) || 75)) exceptionMsg = `만성신장질환 특례 기준(eGFR ${globalSettings?.ckdEgfrMin || 20}~${globalSettings?.ckdEgfrMax || 75}) 미달!`;
                    else if (Number(pt?.uacr) < (Number(globalSettings?.ckdUacrMin) || 200)) exceptionMsg = `만성신장질환 특례 기준(UACR ${globalSettings?.ckdUacrMin || 200} 이상) 미달!`;
                    else iED = true;
                }
            }

            // 3. 특례가 아니라면 당뇨(E11) 룰 적용
            if (!iED) {
              if (!hE) {
                errs.push(`${d.name} 처방은 당뇨(E11) 상병코드 또는 특례 기준 필요! ${exceptionMsg ? `(${exceptionMsg})` : ''}`);
              } else {
                if (iND && !d.allowNonDiabeticCoverage) {
                  errs.push(`일반 당뇨약(${d.name})은 비당뇨 환자(Base 6.5% 미만)에게 처방 불가 삭감!`);
                } else {
                  e11D.push(d);
                }
              }
            }
          });

          // 4. 당뇨(E11) 스텝케어 룰 적용
          if (hE && iIT && !iND && e11D.length > 0) {
            const t1 = Number(globalSettings?.initialMetforminThreshold) || 6.5, t2 = Number(globalSettings?.dualTherapyThreshold) || 7.5;
            const ec = [...new Set(e11D.flatMap(d => d.classes))];
            const hm = ec.some(cl => {
              const obj = (drugClasses || []).find(x => x.id === cl);
              return obj?.name?.includes('메트') || cl === 'dc_met';
            });
            
            if (log.oldHba1c < t1) errs.push(`당뇨(E11) 초기 HbA1c ${t1}% 미만 처방 삭감!`);
            else if (ec.length === 1 && !hm) errs.push(`1차 메트포르민 미사용 삭감!`);
            else if (ec.length >= 2 && log.oldHba1c < t2) errs.push(`초기 급여 2제 병용 기준 미달 삭감!`);
            else if (ec.length >= 2 && !hm) errs.push(`병용 요법 1차약제(메트포르민) 미포함 삭감!`);
          }
        }
        
        if (errs.length > 0) {
          patientErrors[log.patientId] = {
             patientName: log.patientName,
             drugName: log.drugName,
             reasons: errs
          };
          errs.forEach(err => msgs.push(`[${log.patientName}] ${err}`));
        }
      });

      // 🚨 페널티 점수 및 로그 업데이트 반영
      let newScore = Number(state.score) || 0;
      const currentPenalized = state.penalizedPatientIds || [];
      const currentDeductionLogs = state.deductionLogs || [];
      
      let hasNewPenalties = false;
      const newPenalized = [...currentPenalized];
      const newDeductionLogs = [...currentDeductionLogs];

      Object.keys(patientErrors).forEach(pId => {
         const pKey = `${pId}_${state.day}`;
         if (!currentPenalized.includes(pKey)) {
            newScore -= 5;
            newPenalized.push(pKey);
            newDeductionLogs.push({
               id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
               day: state.day,
               patientId: pId,
               patientName: patientErrors[pId].patientName,
               drugName: patientErrors[pId].drugName,
               reasons: patientErrors[pId].reasons,
               timestamp: new Date().toISOString()
            });
            hasNewPenalties = true;
         }
      });

      if (hasNewPenalties) {
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', state.id), {
            score: Math.max(0, newScore),
            penalizedPatientIds: newPenalized,
            deductionLogs: newDeductionLogs
         });
      }

      setDeductions([...new Set(msgs)]);
      setShowSummary(true);
    } catch (err) {
      console.error(err);
      customConfirm("결산 중 오류가 발생했습니다.", () => {}, true);
    }
  };

  const startLadderGame = (idx) => {
    const currentPrizes = (prizes && prizes.length > 0) ? prizes : DEFAULT_PRIZES;
    if (!currentPrizes || currentPrizes.length === 0) { handleFinishDayAndSave(true); return; }
    setSelectedCol(idx); setLadderPhase('animating');
    const tp = currentPrizes.reduce((a, p) => a + (Number(p.probability) || 0), 0) || 1;
    let r = Math.random() * tp, c = 0, wI = 0;
    for (let i = 0; i < currentPrizes.length; i++) {
      c += Number(currentPrizes[i].probability) || 0;
      if (r <= c) { wI = i; break; }
    }
    const aW = currentPrizes[wI];
    const rn = [], st = [30, 70, 110, 150, 190, 230];
    st.forEach(y => { if (Math.random() > 0.4) rn.push({ y, c: 0 }); if (Math.random() > 0.4) rn.push({ y, c: 1 }); });
    const fR = [];
    st.forEach(y => {
      const h0 = rn.find(x => x.y === y && x.c === 0), h1 = rn.find(x => x.y === y && x.c === 1);
      if (h0 && h1) fR.push({ y, c: Math.random() > 0.5 ? 0 : 1 });
      else { if (h0) fR.push(h0); if (h1) fR.push(h1); }
    });
    const cl = [50, 150, 250]; let cC = idx; const pth = [{ x: cl[cC], y: 10 }];
    st.forEach(y => {
      const r = fR.find(x => x.y === y);
      if (r) {
        if (r.c === cC) { pth.push({ x: cl[cC], y }); cC++; pth.push({ x: cl[cC], y }); }
        else if (r.c === cC - 1) { pth.push({ x: cl[cC], y }); cC--; pth.push({ x: cl[cC], y }); }
      }
    });
    pth.push({ x: cl[cC], y: 280 });
    const bp = [null, null, null]; bp[cC] = aW;
    const wPz = currentPrizes.filter(x => !x.name?.includes('꽝')), lPz = currentPrizes.filter(x => x.name?.includes('꽝'));
    if (aW.name?.includes('꽝') && wPz.length > 0) bp[(cC + 1 + Math.floor(Math.random() * 2)) % 3] = wPz[Math.floor(Math.random() * wPz.length)];
    for (let i = 0; i < 3; i++) if (bp[i] === null) bp[i] = lPz.length > 0 ? lPz[Math.floor(Math.random() * lPz.length)] : aW;
    setBottomPrizes(bp); setWonPrize(aW);

    const ctx = canvasRef.current.getContext('2d');
    let tI = 1, cp = { ...pth[0] }, sp = 4;
    const dB = () => {
      ctx.clearRect(0, 0, 300, 300); ctx.lineWidth = 6; ctx.strokeStyle = '#e5e7eb'; ctx.lineCap = 'round';
      cl.forEach(x => { ctx.beginPath(); ctx.moveTo(x, 10); ctx.lineTo(x, 280); ctx.stroke(); });
      fR.forEach(r => { ctx.beginPath(); ctx.moveTo(cl[r.c], r.y); ctx.lineTo(cl[r.c + 1], r.y); ctx.stroke(); });
    };
    const a = () => {
      dB(); const t = pth[tI];
      if (!t) { setLadderPhase('result'); return; }
      const dx = t.x - cp.x, dy = t.y - cp.y, dt = Math.hypot(dx, dy);
      if (dt < sp) { cp = { ...t }; tI++; } else { cp.x += (dx / dt) * sp; cp.y += (dy / dt) * sp; }
      ctx.beginPath(); ctx.moveTo(pth[0].x, pth[0].y);
      for (let i = 1; i < tI; i++) ctx.lineTo(pth[i].x, pth[i].y);
      ctx.lineTo(cp.x, cp.y); ctx.strokeStyle = '#FF6B6B'; ctx.lineWidth = 6; ctx.stroke();
      requestAnimationFrame(a);
    };
    dB(); requestAnimationFrame(a);
  };

  const handleFinishDayAndSave = async (skipPrize = false) => {
    setShowSummary(false); setShowLadder(false); setLadderPhase('idle');
    try {
      const u = { day: Number(state.day) + 1, completedToday: [], streak: Number(state.streak) + 1, lastCompletedDate: new Date().toDateString() };
      if (!skipPrize && wonPrize && wonPrize.name && !wonPrize.name.includes('꽝') && wonPrize.name !== '등록된 경품이 없습니다.') {
        u.prizeLogs = [...(state.prizeLogs || []), { id: Date.now().toString(), day: state.day, prizeName: wonPrize.name, timestamp: new Date().toISOString() }];
      }
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', state.id), u);
    } catch (e) { console.error(e); }
  };

  const handleCancelPrescription = (e, pI) => {
    e.stopPropagation();
    const ld = (state.logs || []).find(x => x.patientId === pI && x.day === state.day);
    if (!ld) return;
    customConfirm('처방 기록을 삭제하시겠습니까?\n(삭제 후 재처방 가능)', async () => {
      try {
        const scoreSub = ld.earnedScore || 10;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', state.id), {
          logs: state.logs.filter(x => x.id !== ld.id),
          completedToday: state.completedToday.filter(x => x !== pI),
          score: Math.max(0, Number(state.score) - scoreSub)
        });
      } catch (e) { console.error(e); }
    });
  };

  return (
    <>
      <div className="max-w-xl mx-auto min-h-screen bg-white shadow-lg flex flex-col relative font-sans">
        <div className="p-4 flex justify-between items-center border-b bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="text-orange-500 font-bold bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 flex gap-1"><Flame size={16} />{state.streak}</div>
            <div className="text-blue-500 font-bold bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 flex gap-1"><Star size={16} />{state.score}</div>
          </div>
          <button onClick={onLogout} className="text-gray-400 hover:text-gray-600 p-2"><LogOut size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 pb-24">
          <div className="flex items-end gap-4 mb-8">
            <div className="w-20 h-20 bg-indigo-100 rounded-full border-4 border-indigo-400 overflow-hidden relative flex items-center justify-center shrink-0">
              {profileImg ? <img src={profileImg} className="w-full h-full object-cover" /> : <User size={40} className="text-indigo-400" />}
            </div>
            <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border-2 border-gray-200 flex-1">
              <p className="font-bold text-lg">사번 <span className="text-indigo-500">{state.empId}</span> 선생님!</p>
              <p className="text-sm text-gray-500">{state.day}일차 진료 시작</p>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex justify-between text-sm font-bold text-gray-500 mb-2"><span>진료 진행도</span><span>{Math.round(progressPercent)}%</span></div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${progressPercent}%` }} /></div>
          </div>

          <div className="space-y-4">
            <h2 className="font-extrabold text-xl flex items-center gap-2"><Users size={24} className="text-gray-400" /> 대기 환자</h2>
            {todaysPatients.map(pt => {
              const isC = completedList.includes(pt.id);
              const pS = getPatientCurrentState(pt, state.logs, medications);
              return (
                <div key={pt.id} className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all ${isC ? 'bg-gray-100 opacity-60' : 'bg-white shadow-sm hover:border-indigo-400'}`} onClick={() => !isC && onStartEncounter(pt.id)}>
                  {isC && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10">
                      <CheckCircle size={32} className="text-indigo-500" />
                      <button onClick={e => handleCancelPrescription(e, pt.id)} className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded shadow-sm border border-red-200 mt-1 hover:bg-red-100 transition-colors">기록 삭제</button>
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-2 pr-12 relative z-0">
                    <span className="font-bold text-lg">{pS.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {pS.type} | {pS.gender}/{pS.age}세 | 현재 HbA1c <span className="text-red-500 font-bold">{pS.currentHba1c}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1 relative z-0">
                    {(pS.comorbidities || []).map(c => <span key={c} className="text-[10px] bg-red-50 text-red-600 px-1 border border-red-200 rounded">{c}</span>)}
                  </div>
                </div>
              )
            })}
            {todaysPatients.length === 0 && <p className="text-center text-gray-500 font-bold py-8">오늘은 대기 환자가 없습니다.</p>}
          </div>
        </div>

        {isAllCompleted && !isLockedOut && (
          <div className="p-4 bg-white border-t sticky bottom-0 z-10">
            <button onClick={evaluateDeductions} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 text-lg transition-transform hover:bg-blue-700">일일 결산 및 퇴근하기</button>
          </div>
        )}

        {showSummary && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] px-4">
            <div className="bg-white p-6 rounded-3xl w-full max-w-sm flex flex-col animate-zoom-in">
              <h2 className="text-2xl font-black mb-4 border-b pb-2"><Activity className="inline text-indigo-600 mr-2" />결산 결과</h2>
              <div className="flex-1 overflow-y-auto max-h-[300px] mb-6 custom-scrollbar pr-2">
                {deductions.length > 0 ? (
                  <div className="bg-red-50 p-4 rounded-xl">
                    <p className="text-red-600 font-bold mb-3 flex items-center gap-2"><AlertTriangle size={20} /> 삭감 사유가 있습니다!</p>
                    <ul className="text-sm text-red-800 list-disc pl-5 space-y-1">
                      {deductions.map((msg, i) => <li key={i}>{msg}</li>)}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-green-50 p-4 rounded-xl text-center">
                    <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
                    <span className="font-bold text-green-800 text-lg">완벽한 처방입니다!</span>
                    <p className="text-sm text-green-600 mt-2">보험 삭감 요소가 없습니다.<br />보상 게임을 시작할 수 있습니다!</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {deductions.length > 0 ? (
                  <>
                    <button onClick={() => setShowSummary(false)} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold text-gray-700 transition-colors hover:bg-gray-300">진료 수정</button>
                    <button onClick={() => handleFinishDayAndSave(true)} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold transition-colors hover:bg-red-600">퇴근하기</button>
                  </>
                ) : (
                  <button onClick={() => { setShowSummary(false); setShowLadder(true); }} className="w-full py-4 bg-yellow-500 text-white rounded-xl font-bold text-lg shadow-md active:scale-95 transition-transform hover:bg-yellow-600">사다리 타기 시작!</button>
                )}
              </div>
            </div>
          </div>
        )}

        {showLadder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] px-4">
            <div className="bg-white p-6 md:p-8 rounded-3xl w-full max-w-[360px] text-center animate-zoom-in">
              <h2 className="text-xl font-black mb-4">보상 사다리</h2>
              <div className="flex justify-between px-6 mb-2">
                {[0, 1, 2].map(i => (
                  <button key={i} onClick={() => ladderPhase === 'idle' && startLadderGame(i)} disabled={ladderPhase !== 'idle'} className={`w-10 h-10 rounded-full font-bold text-white shadow-md transition-all ${ladderPhase === 'idle' ? 'bg-indigo-500 active:scale-95' : selectedCol === i ? 'bg-red-500' : 'bg-gray-300'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="relative w-[300px] h-[300px] mx-auto bg-gray-50 rounded-xl border-2 border-gray-200">
                <canvas ref={canvasRef} width="300" height="300" className="w-full h-full"></canvas>
              </div>
              <div className="flex justify-between px-2 mt-2 h-12">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-[85px] h-full bg-gray-200 rounded border-2 flex items-center justify-center font-bold text-[10px] px-1">
                    {ladderPhase === 'result' ? <span className={bottomPrizes[i]?.name?.includes('꽝') ? 'text-gray-500' : 'text-red-600 truncate text-center leading-tight'}>{bottomPrizes[i]?.name}</span> : <span className="text-gray-400">?</span>}
                  </div>
                ))}
              </div>
              {ladderPhase === 'result' && <button onClick={() => handleFinishDayAndSave(false)} className="w-full mt-6 py-4 bg-blue-500 text-white font-bold rounded-xl active:scale-95 text-lg transition-transform hover:bg-blue-600">확인 및 퇴근</button>}
            </div>
          </div>
        )}
      </div>
      <CustomModal config={confirmConfig} onClose={() => setConfirmConfig(null)} />
    </>
  );
}

function EncounterScreen({ state, patient, medications, medCategories, globalSettings, comorbidityList, drugClasses, sideEffectExemptions, onComplete, db, appId }) {
  const [phase, setPhase] = useState('intro');
  const [dialogue, setDialogue] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState([null, null, null, null, null]);
  const [selectingSlot, setSelectingSlot] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [insuranceCodes, setInsuranceCodes] = useState([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const initializedRef = useRef(false);

  const customAlert = msg => setConfirmConfig({ message: String(msg), onConfirm: () => {}, isAlert: true });
  const encounterDoctorImg = globalSettings?.encounterDoctorImg || null;
  const patientState = useMemo(() => getPatientCurrentState(patient, state.logs, medications), [patient, state.logs, medications]);

  const greetingText = useMemo(() => {
    const pL = (state.logs || []).filter(l => l.patientId === patient.id).sort((a, b) => b.day - a.day);
    let iT = `선생님, ${patient?.desc}`;
    if (pL.length > 0) {
      const h = pL[0].newHba1c, fb = pL[0].patientFeedback || '';
      if (h < 5.0) iT = `선생님, 가끔 어지럽고 식은땀이 나요... 저혈당 온 것 같아요. (현재 HbA1c: ${h}%)`;
      else if (pL[0].sideEffects?.length > 0 || fb.includes('불편') || fb.includes('장애') || fb.includes('감염') || fb.includes('가렵') || fb.includes('부작용') || fb.includes('악화') || fb.includes('떨려요')) iT = `선생님, 저번 진료 이후 이런 증상이 있었어요.\n\n[이전 환자 반응]\n"${fb}"`;
      else if (h <= 6.5) iT = `선생님, 혈당이 ${h}%로 잘 조절되어서 그런지 요즘 컨디션이 아주 좋습니다!`;
      else iT = `선생님, 지난번 처방해주신 약 꾸준히 먹고 있습니다. (현재 HbA1c: ${h}%)`;
    }
    return iT;
  }, [patient.id, patient.desc, state.logs]);

  useEffect(() => { if (phase === 'intro' || phase === 'menu') setDialogue(greetingText); }, [phase, greetingText]);
  useEffect(() => { const t = setTimeout(() => setIsMounted(true), 50); return () => clearTimeout(t); }, []);
  useEffect(() => { if (phase === 'intro') setTimeout(() => setPhase('menu'), 1500); }, [phase]);

  // 🚨 환자가 바뀔 때 초기화 플래그 리셋
  useEffect(() => {
    initializedRef.current = false;
  }, [patient.id]);
  
  useEffect(() => {
    // 🚨 동시접속 오류 완벽 해결: 의존성 배열을 최소화하고, 처음 1번만 세팅하도록 고정
    if (medications.length === 0 || initializedRef.current) return; // 약제가 로드되지 않았거나 이미 초기화되었으면 스킵
    
    const pL = (state.logs || []).filter(l => l.patientId === patient.id).sort((a, b) => b.day - a.day);
    const init = [null, null, null, null, null];
    if (pL.length > 0) {
      pL[0].prescribedDrugs?.forEach(d => { if (d && d.slot >= 1 && d.slot <= 5) init[d.slot - 1] = medications.find(x => x.id === d.id) || null; });
      if (pL[0].insuranceCodes) setInsuranceCodes(pL[0].insuranceCodes);
    }
    else if (patient?.prevDrugs?.length > 0) {
      patient.prevDrugs.forEach((dId, i) => { if (dId && i < 5) init[i] = medications.find(x => x.id === dId) || null; });
    }
    setSelectedDrugs(init);
    initializedRef.current = true;
  }, [patient.id, medications]); // 🚨 state.logs 제외하여 타 유저 간섭 차단

  const handleAction = a => {
    if (a === 'prescribe') { setPhase('prescribe'); setDialogue(`총 5개의 슬롯에 약을 개별 조합할 수 있습니다.\n마지막 4~5번째 칸은 본인부담금입니다.`); }
    else if (a === 'chart') {
      setPhase('chart');
      let t = `[📋 환자 차트 요약]\n • 기본정보: ${patientState?.gender === 'M' ? '남' : '여'}, ${patientState?.age}세\n • 체중: ${patientState?.currentWeight}kg\n • 진료유형: ${patientState?.type}\n • 현재 HbA1c: ${Number(patientState?.currentHba1c).toFixed(1)}% (Base: ${Number(patient?.initialHba1c).toFixed(1)}%)\n • 순응도: ${patientState?.adherence || '좋음'}\n`;
      if (patientState?.currentEgfr || patientState?.currentUacr || patientState?.currentNyha || patientState?.currentLvef || patientState?.currentNtprobnp || patientState?.currentBnp) {
        t += `\n[🔬 의학적 검사 수치]\n`;
        if (patientState?.currentEgfr) t += ` • eGFR: ${patientState.currentEgfr} ml/min/1.73m²\n`;
        if (patientState?.currentUacr) t += ` • UACR: ${patientState.currentUacr} mg/g\n`;
        if (patientState?.currentLvef) t += ` • LVEF: ${patientState.currentLvef}%\n`;
        if (patientState?.currentNyha) t += ` • NYHA: ${patientState.currentNyha}\n`;
        if (patientState?.currentBnp) t += ` • BNP: ${patientState.currentBnp} pg/mL\n`;
        if (patientState?.currentNtprobnp) t += ` • NT-proBNP: ${patientState.currentNtprobnp} pg/mL\n`;
      }
      if (patientState?.comorbidities?.length > 0) t += `\n[🩺 동반 질환]\n • ${patientState.comorbidities.join('\n • ')}\n`;
      const vP = (patient?.prevDrugs || []).filter(Boolean);
      if (vP.length > 0 || patient?.prevTreatment) {
        t += `\n[💊 초기 내원 시 이력]\n`;
        if (patient?.prevTreatment) t += ` • ${patient.prevTreatment}\n`;
        vP.forEach(id => { const md = medications.find(x => x.id === id); if (md) t += ` • 복용약: ${md.name}\n`; });
      }
      const pL = (state.logs || []).filter(l => l.patientId === patient.id).sort((a, b) => a.day - b.day);
      if (pL.length > 0) {
        t += `\n[🔄 처방 이력]\n`;
        pL.forEach(l => { t += ` • ${l.day}일차: ${l.drugName} (${l.newHba1c}%)\n`; });
        t += `\n[💬 피드백]\n`;
        pL.forEach(l => { if (l.patientFeedback) t += ` • ${l.day}일차: "${l.patientFeedback}"\n`; });
      }
      setDialogue(t);
    }
  };

  const handlePickDrug = dr => { const n = [...selectedDrugs]; n[selectingSlot] = dr; setSelectedDrugs(n); setSelectingSlot(null); setSelectedCategory(null); };

  const finalizePrescription = async () => {
    const vD = selectedDrugs.filter(d => d !== null);
    if (vD.length === 0) { setDialogue("약을 최소 1개 이상 처방하세요!"); return; }
    const aND = vD.every(d => d.isNotDrug === true);
    if (insuranceCodes.length === 0 && !aND) { customAlert("⚠️ 처방 시 상병코드(보험코드)를 선택해주세요."); return; }

    try {
      const aC = [...new Set(vD.flatMap(d => d.classes || []))];
      let cGUC = 0;
      (state.logs || []).filter(l => l.patientId === patient.id).forEach(l => {
        if (l.sideEffects) l.sideEffects.forEach(x => { if (x.includes('위장장애') || x.includes('속이')) cGUC++; });
        else if (l.patientFeedback && (l.patientFeedback.includes('위장장애') || l.patientFeedback.includes('속이'))) cGUC++;
      });

      let cE = { h: 0, w: 0, l: 0, n: 0, b: 0, nt: 0, eg: 0, ua: 0 };
      let fM = [], sEM = [];
      let iAP = vD.every(d => d.pkg === 'bottle' || d.isPackaging === true) && !aND;
      let fA = patient.adherence || '좋음';

      vD.forEach(d => {
        let eH = d.isNotDrug ? 0 : (Number(d.effect) || 0);
        const iG = d.sideEffectMsg && (d.sideEffectMsg.includes('위장장애') || d.sideEffectMsg.includes('속이'));
        let cSE = true;
        if (iG && cGUC >= 2) cSE = false;
        if (cSE && sideEffectExemptions?.length > 0) {
          sideEffectExemptions.forEach(ex => {
            if ((ex.classes || []).every(c => aC.includes(c))) {
              if (!ex.keyword || (d.sideEffectMsg && d.sideEffectMsg.includes(ex.keyword))) cSE = false;
            }
          });
        }
        if (!d.isNotDrug && cSE && Math.random() * 100 < (Number(d.sideEffectProb) || 0)) {
          sEM.push(`[${d.name}] ${d.sideEffectMsg}`);
          eH = Math.max(0, eH - (Number(d.sideEffectPenalty) || 0));
          if (iG) cGUC++;
        }
        cE.h += eH; cE.w += Number(d.effectWeight) || 0; cE.l += Number(d.effectLvef) || 0; cE.n += Number(d.effectNyha) || 0; cE.b += Number(d.effectBnp) || 0; cE.nt += Number(d.effectNtprobnp) || 0; cE.eg += Number(d.effectEgfr) || 0; cE.ua += Number(d.effectUacr) || 0;
        (d.beneficialComorb || []).forEach(c => { if ((patient.comorbidities || []).includes(c)) fM.push(`${comorbidityList.find(x => x.name === c)?.goodMsg}`); });
        (d.worseningComorb || []).forEach(c => { if ((patient.comorbidities || []).includes(c)) fM.push(`${comorbidityList.find(x => x.name === c)?.badMsg}`); });
      });

      if (iAP) cE.h += (Number(globalSettings.packagingBonusEffect) || 0.3);
      if (fA === '나쁨' && !iAP && !aND) cE.h = -0.4;
      
      let aB = Number(patient.initialHba1c);
      let nH = Math.max(4.5, Number((aB - cE.h).toFixed(1)));
      let nW = patient.weight ? Number((Number(patient.weight) + cE.w).toFixed(1)) : '';
      let nL = patient.lvef ? Number((Number(patient.lvef) + cE.l).toFixed(1)) : '';
      let nNy = patient.nyha ? Number((Number(patient.nyha) + cE.n).toFixed(1)) : '';
      let nB = patient.bnp ? Number((Number(patient.bnp) + cE.b).toFixed(1)) : '';
      let nNt = patient.ntprobnp ? Number((Number(patient.ntprobnp) + cE.nt).toFixed(1)) : '';
      let nEg = patient.egfr ? Number((Number(patient.egfr) + cE.eg).toFixed(1)) : '';
      let nUa = patient.uacr ? Number((Number(patient.uacr) + cE.ua).toFixed(1)) : '';

      let tR = `${patient?.name}님 처방 완료!\n\n`;
      if (aND) {
        tR += `[생활습관 교정 적용]\n\n환자 반응:\n"${globalSettings.msgLifestyle || '추천해주신 대로 생활습관을 바꾸니 몸이 가볍습니다.'}"\n\n`;
      } else {
        if (iAP) tR += `[병포장 보너스] 순응도 개선 및 추가 강하 적용!\n`;
        if (sEM.length > 0) {
          tR += `⚠️ 부작용 발생으로 약효가 감소했습니다:\n${sEM.map(x => ` • ${x}`).join('\n')}\n\n환자 반응:\n"${globalSettings.msgSideEffect || '선생님, 약을 먹고 나서 속이 좀 불편해요.'}"\n\n`;
        } else {
          fM.unshift(iAP ? (globalSettings.msgPackaging || '병포장이라 약 챙겨 먹기가 훨씬 수월하네요!') : (globalSettings.msgSuccess || '선생님 덕분에 컨디션이 아주 좋습니다! 약이 잘 맞네요.'));
        }
      }
      if (fM.length > 0 && !aND && sEM.length === 0) {
        tR += `[환자 반응]\n${[...new Set(fM)].filter(Boolean).map(f => `"${f}"`).join('\n')}\n\n`;
      }
      if (fA === '나쁨' && !iAP && !aND) tR += `❌ 환자가 약을 제대로 먹지 않았습니다... 혈당 상승!\n\n`;
      tR += `HbA1c 최종 예상: ${Number(patientState.currentHba1c).toFixed(1)}% -> ${nH.toFixed(1)}%`;

      let ptT = '';
      if (nW && nW !== Number(patientState.currentWeight)) ptT += `\n • 체중: ${patientState.currentWeight}kg -> ${nW}kg`;
      if (nL && nL !== Number(patientState.currentLvef)) ptT += `\n • LVEF: ${patientState.currentLvef}% -> ${nL}%`;
      if (nEg && nEg !== Number(patientState.currentEgfr)) ptT += `\n • eGFR: ${patientState.currentEgfr} -> ${nEg}`;
      if (ptT) tR += `\n\n[기타 수치 변화 예상]${ptT}`;

      setPhase('result');
      setDialogue("처방 결과를 데이터베이스에 저장 중입니다...");

      const pI = selectedDrugs.map((d, i) => d ? { slot: i + 1, id: d.id, name: d.name, classes: d.classes || [], isSelfPay: i >= 3, isInsuranceException: d.isInsuranceException === true, isNotDrug: d.isNotDrug === true } : null).filter(Boolean);
      let sF = aND ? (globalSettings.msgLifestyle || '추천해주신 대로 생활습관을 바꾸니 몸이 가볍습니다.') : (sEM.length > 0 ? `${globalSettings.msgSideEffect} (${sEM.map(x => x.includes('] ') ? x.split('] ')[1] : x).join(', ')})` : ([...new Set(fM)].filter(Boolean).join(' ') || (globalSettings.msgSuccess)));

      // 🚨 Score Calculation : 삭감 페널티 환자는 5점만 부여
      const pKey = `${patient.id}_${state.day}`;
      const isPenalized = (state.penalizedPatientIds || []).includes(pKey);
      const scoreAdd = isPenalized ? 5 : 10;

      const nLg = { 
        id: Date.now().toString(), day: Number(state.day), patientId: patient.id || '', patientName: patient.name || '', 
        patientType: patient.type || '', drugName: vD.map(d => d.name).join(' + ') || '', prescribedDrugs: pI, 
        oldHba1c: Number(patientState.currentHba1c) || 0, newHba1c: nH, newWeight: nW, newLvef: nL, newNyha: nNy, 
        newBnp: nB, newNtprobnp: nNt, newEgfr: nEg, newUacr: nUa, adherenceStatus: fA || '좋음', 
        patientFeedback: sF, sideEffects: sEM, insuranceCodes: insuranceCodes, timestamp: new Date().toISOString(),
        earnedScore: scoreAdd
      };
      
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', state.id), { 
        logs: [...(state.logs || []), nLg], 
        completedToday: [...(state.completedToday || []), patient.id], 
        score: (Number(state.score) || 0) + scoreAdd 
      });
      setDialogue(tR);
    } catch (e) {
      customAlert(`[저장 오류] ${e.message}`);
      setPhase('prescribe');
      setDialogue("처방 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  const triggerExit = () => { setIsExiting(true); setTimeout(() => onComplete(), 700); };

  return (
    <>
      <div className="max-w-2xl mx-auto h-[100dvh] bg-gray-50 flex flex-col font-sans relative overflow-hidden shadow-2xl">
        <div className="h-[45vh] md:h-[50vh] relative bg-indigo-50 bg-cover bg-bottom flex flex-col justify-between p-4 shrink-0" style={{ backgroundImage: globalSettings?.backgroundImgUrl ? `url(${globalSettings.backgroundImgUrl})` : 'none' }}>
          {globalSettings?.backgroundImgUrl && <div className="absolute inset-0 bg-black/20"></div>}
          <div className={`self-end bg-white/95 backdrop-blur-sm px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-md border border-white/50 w-full max-w-[220px] sm:max-w-[280px] z-10 mt-2 transition-all duration-700 transform ${isMounted && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'}`}>
            <div className="font-bold border-b border-gray-100 mb-2 pb-1 sm:pb-2 flex justify-between items-center"><span className="text-base sm:text-lg truncate">{patient?.name} <span className="text-sm font-normal text-gray-500">님</span></span><span className="text-[9px] sm:text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{patient?.type}</span></div>
            <div className="flex flex-col gap-1 sm:gap-1.5 mt-1"><div className="text-[10px] sm:text-xs text-gray-500 flex justify-between items-center"><span>BMI</span><span className="font-bold text-gray-700">{patient?.bmi}</span></div><div className="text-[10px] sm:text-xs text-gray-500 flex justify-between items-center"><span>현재 HbA1c</span><span className="text-rose-500 font-black text-sm sm:text-lg">{Number(patientState?.currentHba1c).toFixed(1)}% <span className="text-[8px] sm:text-[10px] text-gray-400 font-normal">(Base {Number(patient?.initialHba1c).toFixed(1)}%)</span></span></div><div className="text-[9px] sm:text-[11px] text-gray-500 flex justify-between items-start pt-1 sm:pt-1.5 border-t border-gray-100"><span className="shrink-0 mr-2 mt-0.5">질환</span><div className="flex flex-wrap gap-1 justify-end">{(patientState?.comorbidities || []).map(c => <span key={c} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold">{c}</span>)}{!(patientState?.comorbidities?.length > 0) && <span className="text-gray-400">없음</span>}</div></div></div>
          </div>
          <div className="flex justify-between items-end z-10 w-full px-2 sm:px-8 mt-auto h-[25vh] sm:h-[35vh]">
            <div className={`h-full w-[50%] flex items-end justify-start drop-shadow-2xl transition-all duration-700 transform ${isMounted && !isExiting ? 'translate-x-0 opacity-100' : '-translate-x-[150%] opacity-0'}`}>
              {encounterDoctorImg ? <img src={encounterDoctorImg} className="max-h-[140%] w-auto object-contain object-bottom origin-bottom scale-100" /> : <div className="w-24 h-24 sm:w-40 sm:h-40 bg-indigo-100 rounded-full flex items-center justify-center border-4 border-white mb-4"><User size={56} className="text-indigo-400" /></div>}
            </div>
            <div className={`h-[70%] w-[45%] flex items-end justify-end mb-2 sm:mb-6 drop-shadow-2xl transition-all duration-700 transform hover:scale-105 ${isMounted && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-[150%] opacity-0'}`}>
              {patient?.imageUrl ? <img src={patient.imageUrl} className="max-h-full w-auto object-contain object-bottom origin-bottom" /> : <div className="w-20 h-20 sm:w-28 sm:h-28 bg-orange-100 rounded-full flex items-center justify-center border-4 border-white mb-4"><User size={40} className="text-orange-400" /></div>}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white z-20 flex flex-col p-4 md:p-6 overflow-hidden border-t-2 rounded-t-3xl -mt-4">
          <div className="bg-blue-50/70 border border-blue-100 p-4 md:p-5 rounded-2xl min-h-[100px] max-h-[30vh] overflow-y-auto custom-scrollbar mb-4 shrink-0"><div className="text-sm md:text-base font-medium whitespace-pre-wrap">{dialogue}</div></div>

          <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
            {phase === 'menu' && (<div className="flex flex-col gap-3 h-full justify-end"><div className="grid grid-cols-2 gap-3"><button onClick={() => handleAction('prescribe')} className="py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-md hover:bg-indigo-700 active:scale-95 flex flex-col items-center justify-center gap-1 transition-all"><Pill size={20} /> 처방 조합</button><button onClick={() => handleAction('chart')} className="py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-50 active:scale-95 flex flex-col items-center justify-center gap-1 transition-all"><FileText size={20} /> 차트 보기</button></div><button onClick={triggerExit} className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 active:scale-95 transition-all">대기실로 가기</button></div>)}
            {(phase === 'result' || phase === 'chart') && (<div className="mt-auto pt-2"><button onClick={() => phase === 'result' ? triggerExit() : setPhase('menu')} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-md hover:bg-indigo-700 active:scale-95 flex justify-center items-center gap-2 transition-all">{phase === 'result' ? <><CheckCircle size={20} /> 진료 완료</> : <><ChevronLeft size={20} /> 메뉴로 돌아가기</>}</button></div>)}
            {phase === 'prescribe' && selectingSlot === null && (
              <div className="flex flex-col gap-2 h-full"><div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1"><div className="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-2 shrink-0"><p className="text-xs font-bold text-blue-800 mb-2">상병코드(보험코드) 선택 (필수)</p><div className="flex gap-2">{['E11 (당뇨)', 'I50 (심부전)', 'N18 (신장병)'].map(c => { const cd = c.split(' ')[0]; const a = insuranceCodes.includes(cd); return <button key={cd} onClick={() => setInsuranceCodes(pr => pr.includes(cd) ? pr.filter(x => x !== cd) : [...pr, cd])} className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg border transition-colors ${a ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{cd}</button> })}</div></div>
                {[0, 1, 2, 3, 4].map(i => { const md = selectedDrugs[i]; const e = md ? (md.isNotDrug ? '🏃‍♂️' : (md.pkg === 'injection' ? '💉' : (md.pkg === 'bottle' || md.isPackaging ? '🫙' : '💊'))) : ''; return <div key={i} className="bg-white border border-gray-200 p-3 rounded-2xl flex justify-between items-center shadow-sm"><div className="flex items-center flex-1 min-w-0 mr-2"><span className={`text-[10px] font-black px-2 py-1 rounded-lg mr-3 shrink-0 ${i >= 3 ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>{i >= 3 ? `본인부담 ${i - 2}` : `급여 ${i + 1}`}</span><span className="text-sm font-bold truncate text-gray-800">{md ? `${e} ${md.name}` : '처방 약제 비어있음'}</span></div><button onClick={() => { setSelectingSlot(i); setSelectedCategory(null); }} className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-bold transition-colors">변경</button></div> })}</div>
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 shrink-0"><button onClick={() => setPhase('menu')} className="flex-1 py-3.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 active:scale-95 transition-all">취소</button><button onClick={finalizePrescription} className="flex-[2] py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all">처방 확정</button></div></div>
            )}
            {phase === 'prescribe' && selectingSlot !== null && selectedCategory === null && (
              <div className="flex flex-col h-full overflow-hidden"><div className="flex justify-between items-center mb-3 px-1 shrink-0"><span className="font-bold text-gray-700 text-sm">약제 카테고리 선택</span><button onClick={() => handlePickDrug(null)} className="text-xs bg-red-50 text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"><Trash2 size={14} /> 슬롯 비우기</button></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1"><button onClick={() => setSelectedCategory('ALL')} className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl font-bold hover:border-indigo-400 hover:shadow-md transition-all flex justify-between items-center shadow-sm"><span className="text-gray-800 flex items-center gap-3"><div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-lg">🔍</div> 전체 약제 보기</span></button>
                  {(medCategories || []).map(c => <button key={c.id} onClick={() => setSelectedCategory(c.id)} className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl font-bold hover:border-indigo-400 hover:shadow-md transition-all flex justify-between items-center shadow-sm"><span className="text-gray-800 flex items-center gap-3"><div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-lg">📁</div> {c.name}</span></button>)}
                </div><button onClick={() => setSelectingSlot(null)} className="w-full mt-3 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors shrink-0">취소</button></div>
            )}
            {phase === 'prescribe' && selectingSlot !== null && selectedCategory !== null && (
              <div className="flex flex-col h-full overflow-hidden"><button onClick={() => setSelectedCategory(null)} className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-indigo-600 mb-3 px-1 transition-colors w-fit shrink-0"><ChevronLeft size={16} /> 카테고리 목록으로</button>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {(medications || []).filter(x => selectedCategory === 'ALL' || x.categoryId === selectedCategory).map(md => { const e = md.isNotDrug ? '🏃‍♂️' : (md.pkg === 'injection' ? '💉' : (md.pkg === 'bottle' || md.isPackaging ? '🫙' : '💊')); return <button key={md.id} onClick={() => handlePickDrug(md)} className="w-full text-left p-4 bg-white border border-gray-200 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all flex items-center shadow-sm group"><div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-xl mr-3 group-hover:bg-indigo-50 transition-colors">{e}</div><div className="flex-1 min-w-0"><div className="font-bold text-gray-800 truncate text-sm">{md.name}</div><div className="text-xs text-gray-400 mt-0.5 font-medium">{md.isNotDrug ? '비약물 처방' : `HbA1c 강하: -${md.effect}%`}</div></div><ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-400 transition-colors" /></button> })}
                </div></div>
            )}
          </div>
        </div>
      </div>
      <CustomModal config={confirmConfig} onClose={() => setConfirmConfig(null)} />
    </>
  );
}

function AdminScreen({ patients, medications, drugClasses, medCategories, deductionRules, allowedCombinations, sideEffectExemptions, prizes, allGameStates, globalSettings, comorbidityList, onLogout, db, appId }) {
  const [tab, setTab] = useState('settings');
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [editingMed, setEditingMed] = useState(null);
  const [newComorb, setNewComorb] = useState({ name: '', goodMsg: '', badMsg: '' });
  const [filesObj, setFilesObj] = useState({});
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState(''); // 🚨 사번 검색 기능용 State

  const customConfirm = (msg, onConfirm, isAlert = false) => setConfirmConfig({ message: String(msg), onConfirm: onConfirm, isAlert: isAlert });
  const customAlert = msg => setConfirmConfig({ message: String(msg), onConfirm: () => { }, isAlert: true });

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const saveDoc = async (col, d, id) => {
    try {
      const docId = (id && id !== 'new') ? id : `${col}_${Date.now()}`;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', col, docId), { ...d, id: docId });
    } catch (e) { customAlert("저장 실패: " + e.message); }
  };

  const deleteDocAdmin = (col, id) => customConfirm('삭제하시겠습니까?', async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id)));
  
  const handleDragStart = i => setDraggedItemIndex(i);
  
  const handleDrop = async (idx, col, lst) => {
    if (draggedItemIndex === null || draggedItemIndex === idx) return;
    const nL = [...lst].sort((a, b) => (a.order || 0) - (b.order || 0));
    const [itm] = nL.splice(draggedItemIndex, 1);
    nL.splice(idx, 0, itm);
    setDraggedItemIndex(null);
    try { await Promise.all(nL.map((x, i) => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', col, x.id), { order: i }))); } catch (e) { }
  };

  const handleCopyPatient = pt => { const { id, ...r } = pt; setEditingPatient({ ...r, name: pt.name + ' (복사본)', order: (pt.order || 0) + 0.1, isCopiedFromId: pt.id }); setFilesObj({}); };
  const handleCopyMed = md => { const { id, ...r } = md; setEditingMed({ ...r, name: md.name + ' (복사본)', order: (md.order || 0) + 0.1, isCopiedFromId: md.id }); };

  const handleAddComorb = async e => { e.preventDefault(); if (!newComorb.name.trim() || comorbidityList.some(x => x.name === newComorb.name.trim())) return; await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), { comorbidities: [...comorbidityList, { name: newComorb.name.trim(), goodMsg: newComorb.goodMsg.trim(), badMsg: newComorb.badMsg.trim() }] }, { merge: true }); setNewComorb({ name: '', goodMsg: '', badMsg: '' }); };
  const handleDeleteComorb = n => customConfirm(`'${n}' 삭제?`, async () => await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), { comorbidities: comorbidityList.filter(x => x.name !== n) }, { merge: true }));
  const deleteEmployee = id => customConfirm('직원 데이터 삭제?', async () => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', id)));
  
  const handleDeleteLogAdmin = async (eI, lI, pI, lD) => {
    customConfirm('처방 기록을 삭제하시겠습니까?', async () => { 
      const st = allGameStates.find(x => x.empId === eI); 
      if (!st) return; 
      
      const pKey = `${pI}_${lD}`;
      const isPenalized = (st.penalizedPatientIds || []).includes(pKey);
      const scoreSub = isPenalized ? 5 : 10;

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', st.id), { 
        logs: (st.logs || []).filter(x => x.id !== lI), 
        completedToday: st.day === lD ? (st.completedToday || []).filter(x => x !== pI) : st.completedToday, 
        score: Math.max(0, Number(st.score) - scoreSub) 
      }); 
    });
  };

  const handleExportCSV = () => { let c = '\uFEFF사번,'; for (let i = 1; i <= 20; i++)c += `${i}일차,`; c += '\n'; allGameStates.forEach(s => { let r = [s.empId]; for (let i = 1; i <= 20; i++) { const l = (s.logs || []).filter(x => x.day === i); r.push(l.length > 0 ? `"${l.map(x => `[${x.patientName}] ${x.drugName} (${x.newHba1c}%)`).join('/')}"` : ''); } c += r.join(',') + '\n'; }); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv;charset=utf-8;' })); a.download = 'records.csv'; a.click(); };
  const handleExportPrizesCSV = () => { let c = '\uFEFF사번,당첨일차,상품명,일시\n'; allGameStates.forEach(s => (s.prizeLogs || []).forEach(l => { c += [s.empId, l.day, `"${l.prizeName}"`, new Date(l.timestamp).toLocaleString()].join(',') + '\n'; })); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv;charset=utf-8;' })); a.download = 'prizes.csv'; a.click(); };
  const handleResetAllData = () => customConfirm('전체 초기화?', async () => { await Promise.all(allGameStates.map(st => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', st.id)))); customAlert('완료.'); });

  // 🚨 삭감 엑셀 익스포트 함수
  const handleExportDeductionsCSV = () => { 
    let c = '\uFEFF사번,삭감일차,환자명,처방약,삭감사유,일시\n'; 
    allGameStates.forEach(s => { 
      (s.deductionLogs || []).forEach(l => { 
        const rsn = (l.reasons || []).join(' / ').replace(/"/g, '""');
        c += `"${s.empId}",${l.day},"${l.patientName}","${l.drugName}","${rsn}","${new Date(l.timestamp).toLocaleString()}"\n`; 
      }); 
    }); 
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv;charset=utf-8;' })); 
    a.download = 'deductions.csv'; 
    a.click(); 
  };

  const handleLoadDefaultMedications = async () => {
    customConfirm('🚨 기본 60종으로 초기화?', async () => {
      try {
        for (const md of medications) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'medications', md.id));
        for (const cat of medCategories) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'medCategories', cat.id));
        for (const cat of DEFAULT_MED_CATEGORIES) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'medCategories', cat.id), cat);
        for (const md of DEFAULT_MEDICATIONS) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'medications', md.id), md);
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), { comorbidities: DEFAULT_COMORBIDITIES }, { merge: true });
        customAlert('60종 약제 세팅 완료!');
      } catch (err) { customAlert('약제 초기화 오류'); }
    });
  };

  const handleLoadDefaultPatients = async () => {
    customConfirm('🚨 기본 20명으로 초기화?', async () => {
      try {
        for (const pt of patients) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patients', pt.id));
        for (const pt of DEFAULT_PATIENTS_EXTENDED) await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'patients', pt.id), pt);
        customAlert('리얼 환자 20종 세팅 완료!');
      } catch (err) { customAlert('환자 초기화 오류'); }
    });
  };

  const inputBase = "w-full p-2 border rounded text-xs font-bold bg-white focus:outline-none transition-colors focus:border-indigo-400";
  const renderFile = (l, k, w, sz) => (<div key={k} className="text-center bg-white p-2 rounded-xl border"><div className={`mx-auto mb-1 overflow-hidden flex items-center justify-center ${w}`}>{(filesObj[k] || globalSettings[k === 'base' ? 'dashboardBaseImg' : (k === 'logo' ? 'loginLogoUrl' : k === 'bg' ? 'backgroundImgUrl' : k === 'titleIcon' ? 'loginTitleIconUrl' : k === 'encounter' ? 'encounterDoctorImg' : k)]) && <img src={filesObj[k] || globalSettings[k === 'base' ? 'dashboardBaseImg' : (k === 'logo' ? 'loginLogoUrl' : k === 'bg' ? 'backgroundImgUrl' : k === 'titleIcon' ? 'loginTitleIconUrl' : k === 'encounter' ? 'encounterDoctorImg' : k)]} className="w-full h-full object-cover" />}</div><label className="text-[10px] cursor-pointer bg-gray-100 px-1 py-1 rounded block font-bold hover:bg-gray-200">{l}<input type="file" className="hidden" onChange={e => processImageFile(e.target.files[0], b => setFilesObj(pr => ({ ...pr, [k]: b })), sz)} /></label></div>);
  const renderInput = (l, n, dv, t = "number", st = "0.1") => (<div key={n}><label className="text-xs font-bold block mb-1 text-gray-700">{l}</label><input name={n} type={t} step={t === 'number' ? st : undefined} defaultValue={dv} className={inputBase} required={t === 'text'} /></div>);

  const renderMedForm = (md) => (
    <form onSubmit={async e => {
      e.preventDefault(); const fd = new FormData(e.target);
      const d = {
        name: fd.get('n'), effect: Number(fd.get('e')), desc: fd.get('d'), pkg: fd.get('pkg'), isPackaging: fd.get('pkg') === 'bottle',
        categoryId: fd.get('categoryId') || '', isNotDrug: fd.get('isND') === 'true', sideEffectProb: Number(fd.get('sep')) || 0,
        sideEffectMsg: fd.get('sem'), sideEffectPenalty: Number(fd.get('sep_pen')) || 0, 
        allowHFrEFCoverage: fd.get('hfRedCov') === 'true', allowHFpEFCoverage: fd.get('hfPreCov') === 'true', allowCkdCoverage: fd.get('ckdCov') === 'true',
        isInsuranceException: fd.get('insEx') === 'true', allow2TQD: fd.get('a2tqd') === 'true', effectWeight: Number(fd.get('eWeight')) || 0,
        effectLvef: Number(fd.get('eLvef')) || 0, effectBnp: Number(fd.get('eBnp')) || 0, effectNtprobnp: Number(fd.get('eNtprobnp')) || 0,
        effectEgfr: Number(fd.get('eEgfr')) || 0, effectUacr: Number(fd.get('eUacr')) || 0, classes: [fd.get('c1'), fd.get('c2'), fd.get('c3')].filter(c => c && c !== 'none'),
        order: md.order || 0, egfrLimit: Number(fd.get('elim')) || 0, beneficialComorb: comorbidityList.map(c => c.name).filter(n => fd.get(`b_${n}`)),
        worseningComorb: comorbidityList.map(c => c.name).filter(n => fd.get(`w_${n}`))
      };
      await saveDoc('medications', d, md.id === 'new' ? undefined : md.id); setEditingMed(null);
    }} className="bg-indigo-50 p-6 rounded-2xl shadow-inner mb-6 border border-indigo-100 animate-fade-in-up">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div className="md:col-span-2">{renderInput('약품명', 'n', md.name, 'text')}</div>
        <div>{renderInput('HbA1c 효과 (-%)', 'e', md.effect)}</div>
        <div><label className="text-xs font-bold block mb-1 text-gray-700">포장형태</label><select name="pkg" defaultValue={md.pkg || (md.isPackaging ? 'bottle' : 'ptp')} className={inputBase}><option value="ptp">PTP</option><option value="bottle">병포장</option><option value="injection">주사제</option></select></div>
        <div>{renderInput('eGFR 하한선 (처방금기)', 'elim', md.egfrLimit)}</div>
      </div>
      <div className="bg-white p-4 rounded-xl flex items-center justify-between shadow-sm mb-4">
        <label className="text-sm font-bold text-indigo-900 w-1/3">카테고리</label>
        <select name="categoryId" defaultValue={md.categoryId || ''} className="w-2/3 p-2 border rounded font-bold bg-indigo-50 focus:outline-none">
          <option value="">- 전체 -</option>
          {medCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1 bg-orange-50 p-3 rounded-xl shadow-sm border border-orange-200">
          <label className="text-sm font-bold flex items-center gap-2 cursor-pointer text-orange-900"><input type="checkbox" name="isND" value="true" defaultChecked={md.isNotDrug} className="w-5 h-5" />✅ 비약물(삭감 회피)</label>
        </div>
        <div className="flex-1 bg-yellow-50 p-3 rounded-xl shadow-sm border border-yellow-200">
          <label className="text-sm font-bold flex items-center gap-2 cursor-pointer text-yellow-900"><input type="checkbox" name="a2tqd" value="true" defaultChecked={md.allow2TQD} className="w-5 h-5" />✌️ 2T QD (중복면제)</label>
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
        <label className="block text-sm font-bold mb-3 border-b pb-2 text-gray-800">계열 (최대3개)</label>
        <div className="flex gap-2">
          {[1, 2, 3].map(n => <select key={n} name={`c${n}`} defaultValue={md.classes?.[n - 1] || 'none'} className={inputBase}><option value="none">- 없음 -</option>{drugClasses.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}</select>)}
        </div>
      </div>
      <div className="bg-teal-50 p-4 rounded-xl shadow-sm border border-teal-200 mb-4">
        <label className="block text-sm font-bold mb-3 border-b pb-2 text-teal-900">타겟 지표 변화량</label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[['체중(kg)', 'eWeight', md.effectWeight], ['LVEF(%)', 'eLvef', md.effectLvef], ['BNP', 'eBnp', md.effectBnp], ['NTpro', 'eNtprobnp', md.effectNtprobnp], ['eGFR', 'eEgfr', md.effectEgfr], ['UACR', 'eUacr', md.effectUacr]].map(([l, n, d]) => <div key={n}><label className="text-[10px] font-bold block mb-1 text-teal-800">{l}</label><input name={n} type="number" step="0.1" defaultValue={d || 0} className={inputBase} /></div>)}
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1 bg-red-50 p-4 rounded-xl shadow-sm border border-red-200">
          <label className="text-sm font-black flex items-center gap-2 text-red-800 cursor-pointer"><input type="checkbox" name="insEx" value="true" defaultChecked={md.isInsuranceException} className="w-5 h-5" />🔥 보험 예외 (모든 삭감 무시)</label>
        </div>
        
        {/* 🚨 비당뇨 특례 3개로 분리 적용 */}
        <div className="flex-[3] flex gap-2">
          <div className="flex-1 bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200">
            <label className="text-xs font-bold flex items-center gap-1 cursor-pointer text-blue-900"><input type="checkbox" name="hfRedCov" value="true" defaultChecked={md.allowHFrEFCoverage} className="w-4 h-4" />심부전(LVEF &lt; 40)</label>
          </div>
          <div className="flex-1 bg-cyan-50 p-4 rounded-xl shadow-sm border border-cyan-200">
            <label className="text-xs font-bold flex items-center gap-1 cursor-pointer text-cyan-900"><input type="checkbox" name="hfPreCov" value="true" defaultChecked={md.allowHFpEFCoverage} className="w-4 h-4" />심부전(LVEF &ge; 40)</label>
          </div>
          <div className="flex-1 bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-200">
            <label className="text-xs font-bold flex items-center gap-1 cursor-pointer text-purple-900"><input type="checkbox" name="ckdCov" value="true" defaultChecked={md.allowCkdCoverage} className="w-4 h-4" />신부전 특례</label>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <label className="block text-xs font-bold text-blue-800 mb-2">이점(호전) 질환군 선택</label>
          <div className="flex flex-wrap gap-2">{comorbidityList.map(c => <label key={c.name} className="text-[11px] bg-gray-50 border px-2 py-1 rounded-full cursor-pointer hover:bg-blue-50"><input type="checkbox" name={`b_${c.name}`} value="true" defaultChecked={(md.beneficialComorb || []).includes(c.name)} className="mr-1" />{c.name}</label>)}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <label className="block text-xs font-bold text-red-800 mb-2">악화 질환군 선택</label>
          <div className="flex flex-wrap gap-2">{comorbidityList.map(c => <label key={c.name} className="text-[11px] bg-gray-50 border px-2 py-1 rounded-full cursor-pointer hover:bg-red-50"><input type="checkbox" name={`w_${c.name}`} value="true" defaultChecked={(md.worseningComorb || []).includes(c.name)} className="mr-1" />{c.name}</label>)}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>{renderInput('부작용 확률(%)', 'sep', md.sideEffectProb)}</div>
        <div>{renderInput('부작용 패널티(-%)', 'sep_pen', md.sideEffectPenalty)}</div>
        <div>{renderInput('부작용 메시지', 'sem', md.sideEffectMsg, 'text')}</div>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <button type="button" onClick={() => setEditingMed(null)} className="px-6 py-2 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400 transition-colors">취소</button>
        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">저장</button>
      </div>
    </form>
  );

  const renderPatForm = (pt) => (
    <form onSubmit={async e => {
      e.preventDefault(); const fd = new FormData(e.target);
      const d = {
        name: fd.get('n'), type: fd.get('t'), initialHba1c: Number(fd.get('h')), age: Number(fd.get('a')), gender: fd.get('g'), weight: Number(fd.get('w')),
        bmi: Number(fd.get('bmi')), adherence: fd.get('adh'), lvef: fd.get('lvef'), nyha: fd.get('nyha'), bnp: fd.get('bnp'), ntprobnp: fd.get('ntprobnp'),
        egfr: fd.get('egfr'), uacr: fd.get('uacr'), hfHospitalization: fd.get('hfH') === 'true', echoAbnormal: fd.get('echoA') === 'true',
        hfStandardTx: fd.get('sht') === 'true', dipstick: fd.get('dip') === 'true', ckdStandardTx: fd.get('acei') === 'true', desc: fd.get('d'),
        prevTreatment: fd.get('pt'), order: pt.order, prevDrugs: [fd.get('pd0'), fd.get('pd1'), fd.get('pd2'), fd.get('pd3'), fd.get('pd4')].map(v => v === 'none' ? '' : v),
        imageUrl: filesObj.patient || pt.imageUrl || '', comorbidities: comorbidityList.map(c => c.name).filter(n => fd.get(`c_${n}`))
      };
      await saveDoc('patients', d, pt.id === 'new' ? undefined : pt.id); setEditingPatient(null); setFilesObj({});
    }} className="bg-indigo-50 p-6 rounded-2xl shadow-inner mb-6 animate-fade-in-up border border-indigo-100">
      <div className="grid grid-cols-4 gap-4 mb-4">
        {renderInput('이름', 'n', pt.name, 'text')}
        {renderInput('나이', 'a', pt.age)}
        {renderInput('체중', 'w', pt.weight)}
        {renderInput('BMI', 'bmi', pt.bmi)}
        {renderInput('Base 초기 HbA1c', 'h', pt.initialHba1c)}
        <div><label className="text-xs font-bold block mb-1 text-gray-700">성별</label><select name="g" defaultValue={pt.gender} className={inputBase}><option value="M">남성</option><option value="F">여성</option></select></div>
        <div><label className="text-xs font-bold block mb-1 text-gray-700">유형</label><select name="t" defaultValue={pt.type} className={inputBase}><option value="초진">초진</option><option value="재진">재진</option><option value="리핏">리핏</option></select></div>
        <div><label className="text-xs font-bold block mb-1 text-blue-600">순응도</label><select name="adh" defaultValue={pt.adherence} className={inputBase}><option value="좋음">좋음</option><option value="나쁨">나쁨</option></select></div>
      </div>
      <div className="bg-white p-4 rounded-xl mb-4 border">
        <p className="text-sm font-bold text-blue-900 mb-3 border-b pb-2">🩺 비당뇨 환자 특례 PASS 체크리스트</p>
        <div className="grid grid-cols-6 gap-3 mb-4">
          {renderInput('LVEF', 'lvef', pt.lvef)}
          {renderInput('NYHA', 'nyha', pt.nyha)}
          {renderInput('BNP', 'bnp', pt.bnp)}
          {renderInput('NTpro', 'ntprobnp', pt.ntprobnp)}
          {renderInput('eGFR', 'egfr', pt.egfr)}
          {renderInput('UACR', 'uacr', pt.uacr)}
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          <label className="text-xs bg-gray-50 p-1.5 rounded cursor-pointer border hover:bg-gray-100"><input type="checkbox" name="sht" value="true" defaultChecked={pt.hfStandardTx} className="mr-1" />HF표준 투여중</label>
          <label className="text-xs bg-gray-50 p-1.5 rounded cursor-pointer border hover:bg-gray-100"><input type="checkbox" name="echoA" value="true" defaultChecked={pt.echoAbnormal} className="mr-1" />초음파이상</label>
          <label className="text-xs bg-gray-50 p-1.5 rounded cursor-pointer border hover:bg-gray-100"><input type="checkbox" name="hfH" value="true" defaultChecked={pt.hfHospitalization} className="mr-1" />12M입원</label>
          <label className="text-xs bg-gray-50 p-1.5 rounded cursor-pointer border hover:bg-gray-100"><input type="checkbox" name="dip" value="true" defaultChecked={pt.dipstick} className="mr-1" />요검사1+</label>
          <label className="text-xs bg-gray-50 p-1.5 rounded cursor-pointer border hover:bg-gray-100"><input type="checkbox" name="acei" value="true" defaultChecked={pt.ckdStandardTx} className="mr-1" />CKD표준 투여</label>
        </div>
      </div>
      <div className="bg-yellow-50 p-4 rounded-xl mb-4 border border-yellow-200">
        <p className="text-sm font-bold text-orange-700 mb-2">기존 복용약 5슬롯 세팅</p>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4].map(i => <select key={i} name={`pd${i}`} defaultValue={pt.prevDrugs?.[i] || 'none'} className={inputBase}><option value="none">- {i >= 3 ? '본인부담' : '급여'} -</option>{medications.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>)}
        </div>
      </div>
      <div className="mb-4">
        <p className="text-sm font-bold mb-2 text-gray-800">동반 질환</p>
        <div className="flex flex-wrap gap-2 bg-white p-3 rounded-xl border">
          {comorbidityList.map(c => <label key={c.name} className="text-xs border px-3 py-1.5 rounded bg-gray-50 font-bold cursor-pointer hover:bg-indigo-50"><input type="checkbox" name={`c_${c.name}`} value="true" defaultChecked={(pt.comorbidities || []).includes(c.name)} className="mr-1" />{c.name}</label>)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>{renderInput('증상/대사', 'd', pt.desc, 'text')}</div>
        <div>{renderInput('이전치료(차트 기록용)', 'pt', pt.prevTreatment, 'text')}</div>
      </div>
      <div className="flex justify-between items-center border-t border-indigo-100 pt-4">
        <label className="cursor-pointer bg-white px-4 py-2 border rounded font-bold shadow-sm flex items-center gap-2 hover:bg-gray-50">
          <Upload size={16} /> 사진 업로드
          <input type="file" className="hidden" onChange={e => processImageFile(e.target.files[0], b => setFilesObj({ ...filesObj, patient: b }), 200)} />
        </label>
        {(filesObj.patient || pt.imageUrl) && <img src={filesObj.patient || pt.imageUrl} className="h-12 w-12 object-cover rounded-full border absolute left-1/2 -translate-x-1/2" />}
        <div className="flex gap-2">
          <button type="button" onClick={() => { setEditingPatient(null); setFilesObj({}); }} className="px-6 py-2 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400 transition-colors">취소</button>
          <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 transition-colors">저장</button>
        </div>
      </div>
    </form>
  );

  // 🚨 사번 검색 기능용 변수 (직원 탭)
  const filteredGameStates = allGameStates.filter(st => st.empId.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-lg p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-black flex items-center gap-2 text-indigo-900"><ShieldAlert className="text-indigo-500" /> Persona Admin</h1>
          <button onClick={onLogout} className="text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors">로그아웃</button>
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['settings', 'patients', 'medications', 'classes', 'prizes', 'records'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${tab === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* --- SETTINGS TAB --- */}
        {tab === 'settings' && (
          <form onSubmit={e => {
            e.preventDefault(); const fd = new FormData(e.target);
            customConfirm('설정을 저장하시겠습니까?', async () => {
              const d = {
                loginBgStart: fd.get('bgS'), loginBgEnd: fd.get('bgE'), loginBtnColor: fd.get('btnC'), initialMetforminThreshold: Number(fd.get('metT')), dualTherapyThreshold: Number(fd.get('dualT')), patientsPerDay: Number(fd.get('ppd')), allowMultipleDaysPerRealDay: fd.get('mult') === 'true', packagingBonusEffect: Number(fd.get('pbe')), hfLvefMax: Number(fd.get('hfM')), hfNyhaMin: Number(fd.get('hfNyha')), hfBnpMin: Number(fd.get('hfBnp')), hfNtprobnpMin: Number(fd.get('hfNt')), ckdEgfrMin: Number(fd.get('ckdEmin')), ckdEgfrMax: Number(fd.get('ckdEmax')), ckdUacrMin: Number(fd.get('ckdM')), sglt2EgfrLimit: Number(fd.get('sgltL')), msgSuccess: fd.get('msgSuccess') || "성공", msgSideEffect: fd.get('msgSideEffect') || "부작용", msgPackaging: fd.get('msgPackaging') || "병포장", msgLifestyle: fd.get('msgLifestyle') || "생활습관", loginMainTitle: fd.get('mainTitle') || "Persona", loginSubTitle: fd.get('subTitle') || "",
                img3: filesObj.img3 || globalSettings.img3 || '', img5: filesObj.img5 || globalSettings.img5 || '', img10: filesObj.img10 || globalSettings.img10 || '', img15: filesObj.img15 || globalSettings.img15 || '', img20: filesObj.img20 || globalSettings.img20 || '', loginLogoUrl: filesObj.logo || globalSettings.loginLogoUrl || '', loginTitleIconUrl: filesObj.titleIcon || globalSettings.loginTitleIconUrl || '', dashboardBaseImg: filesObj.base || globalSettings.dashboardBaseImg || '', encounterDoctorImg: filesObj.encounter || globalSettings.encounterDoctorImg || '', backgroundImgUrl: filesObj.bg || globalSettings.backgroundImgUrl || ''
              };
              await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), d, { merge: true });
              customAlert('환경 설정이 성공적으로 저장되었습니다.'); setFilesObj({});
            });
          }} className="space-y-6 animate-fade-in-up">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border rounded-2xl bg-indigo-50 shadow-sm">
                <h3 className="font-bold border-b border-indigo-200 pb-2 mb-3 text-indigo-900">기본 시스템 & 초진 기준</h3>
                <div className="grid grid-cols-2 gap-4">
                  {renderInput('1차 메트포르민 권고(%)', 'metT', globalSettings.initialMetforminThreshold)}
                  {renderInput('2제 병용 허용(%)', 'dualT', globalSettings.dualTherapyThreshold)}
                  {renderInput('하루 진료 환자수', 'ppd', globalSettings.patientsPerDay)}
                  {renderInput('병포장 추가 강하(-%)', 'pbe', globalSettings.packagingBonusEffect)}
                  <div className="col-span-2">
                    <label className="text-xs font-bold block mb-1 text-gray-700">진도 제한 여부</label>
                    <select name="mult" defaultValue={globalSettings.allowMultipleDaysPerRealDay ? 'true' : 'false'} className={inputBase}>
                      <option value="true">제한 없음 (자유롭게 진행)</option>
                      <option value="false">하루 1일차만 (자정 초기화)</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* 🚨 SGLT2 및 특례 기준 명확한 분리 반영 */}
              <div className="p-6 border rounded-2xl bg-red-50 shadow-sm flex flex-col gap-6">
                <div>
                  <h3 className="font-bold border-b border-red-200 pb-2 mb-3 text-red-900">비당뇨 심부전 (LVEF &lt; 40) 기준</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderInput('LVEF 기준값(미만)', 'hfM', globalSettings.hfLvefMax)}
                    {renderInput('NYHA 하한 (공통)', 'hfNyha', globalSettings.hfNyhaMin)}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold border-b border-red-200 pb-2 mb-3 text-red-900">비당뇨 심부전 (LVEF &ge; 40) 기준</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderInput('BNP 이상', 'hfBnp', globalSettings.hfBnpMin)}
                    {renderInput('NT-proBNP 이상', 'hfNt', globalSettings.hfNtprobnpMin)}
                  </div>
                  <p className="text-xs text-red-600 mt-2">* LVEF 40 이상은 위 수치와 NYHA 하한 기준을 동시 충족해야 합니다.</p>
                </div>
                <div>
                  <h3 className="font-bold border-b border-red-200 pb-2 mb-3 text-red-900">비당뇨 신부전 기준</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {renderInput('eGFR 하한', 'ckdEmin', globalSettings.ckdEgfrMin)}
                    {renderInput('eGFR 상한', 'ckdEmax', globalSettings.ckdEgfrMax)}
                    {renderInput('UACR 이상', 'ckdM', globalSettings.ckdUacrMin)}
                  </div>
                </div>
                <div>
                  <h3 className="font-bold border-b border-red-200 pb-2 mb-3 text-red-900">당뇨 환자 SGLT2 공통 금기</h3>
                  <div className="w-full md:w-1/2">
                    {renderInput('eGFR 하한선', 'sgltL', globalSettings.sglt2EgfrLimit)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border rounded-2xl bg-teal-50 shadow-sm">
              <h3 className="font-bold mb-4 text-lg text-teal-900 border-b border-teal-200 pb-2">환자 기본 반응 대사 설정 (커스텀)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderInput('✅ 성공 시', 'msgSuccess', globalSettings.msgSuccess, 'text')}
                {renderInput('⚠️ 부작용 시', 'msgSideEffect', globalSettings.msgSideEffect, 'text')}
                {renderInput('💊 병포장 시', 'msgPackaging', globalSettings.msgPackaging, 'text')}
                {renderInput('🏃‍♂️ 생활습관 교정 시', 'msgLifestyle', globalSettings.msgLifestyle, 'text')}
              </div>
            </div>
            <div className="p-6 border rounded-2xl bg-gray-50 shadow-sm">
              <h3 className="font-bold mb-4 border-b pb-2 text-gray-800">테마 및 시스템 이미지 관리</h3>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">{renderInput('메인 타이틀', 'mainTitle', globalSettings.loginMainTitle, 'text')}</div>
                <div className="flex-[2]">{renderInput('서브 타이틀', 'subTitle', globalSettings.loginSubTitle, 'text')}</div>
              </div>
              <div className="flex gap-4 mb-4">
                <div className="flex-1"><label className="block text-xs font-bold mb-1 text-gray-700">배경 시작색</label><input type="color" name="bgS" defaultValue={globalSettings.loginBgStart} className="w-full h-10 border rounded cursor-pointer" /></div>
                <div className="flex-1"><label className="block text-xs font-bold mb-1 text-gray-700">배경 끝색</label><input type="color" name="bgE" defaultValue={globalSettings.loginBgEnd} className="w-full h-10 border rounded cursor-pointer" /></div>
                <div className="flex-1"><label className="block text-xs font-bold mb-1 text-gray-700">버튼색</label><input type="color" name="btnC" defaultValue={globalSettings.loginBtnColor} className="w-full h-10 border rounded cursor-pointer" /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {renderFile('로고', 'logo', 'w-16 h-16 rounded border', 600)}
                {renderFile('타이틀 아이콘', 'titleIcon', 'w-16 h-16 rounded border', 600)}
                {renderFile('의사 뒷모습', 'encounter', 'w-16 h-16 rounded border', 600)}
                {renderFile('진료실 배경', 'bg', 'w-16 h-16 rounded border', 600)}
              </div>
              <h3 className="font-bold mt-6 mb-3 text-orange-700 border-b pb-2">연속 진료 (Streak) 프로필 진화</h3>
              <div className="grid grid-cols-6 gap-2">
                {renderFile('기본', 'base', 'w-12 h-12 rounded-full border', 200)}
                {renderFile('3일차', 'img3', 'w-12 h-12 rounded-full border', 200)}
                {renderFile('5일차', 'img5', 'w-12 h-12 rounded-full border', 200)}
                {renderFile('10일차', 'img10', 'w-12 h-12 rounded-full border', 200)}
                {renderFile('15일차', 'img15', 'w-12 h-12 rounded-full border', 200)}
                {renderFile('20일차', 'img20', 'w-12 h-12 rounded-full border', 200)}
              </div>
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all text-lg">
              전체 설정 저장
            </button>
          </form>
        )}

        {/* --- PATIENTS TAB --- */}
        {tab === 'patients' && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">환자 마스터 (드래그로 순서 변경)</h2>
              <div className="flex gap-2">
                <button onClick={handleLoadDefaultPatients} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow hover:bg-emerald-700 transition-colors">20종 세팅</button>
                <button onClick={() => { setEditingPatient({ id: 'new', order: patients.length + 1, type: '초진', gender: 'M', prevDrugs: ['', '', '', '', ''], hfHospitalization: false, echoAbnormal: false, hfStandardTx: false, dipstick: false, ckdStandardTx: false }); setFilesObj({}); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow hover:bg-indigo-700 transition-colors">+ 환자 추가</button>
              </div>
            </div>
            
            {editingPatient && editingPatient.id === 'new' && renderPatForm(editingPatient)}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((pt, i) => (
                <React.Fragment key={pt.id}>
                  {editingPatient && editingPatient.id === pt.id && renderPatForm(editingPatient)}
                  <div draggable onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i, 'patients', patients)} className="bg-white p-4 border rounded-2xl flex items-center justify-between shadow-sm cursor-move hover:border-indigo-400 transition-all">
                    <div className="flex items-center gap-4">
                      <GripVertical className="text-gray-300" size={20} />
                      {pt.imageUrl ? <img src={pt.imageUrl} className="w-12 h-12 object-cover rounded-full border shadow-sm" /> : <div className="w-12 h-12 bg-indigo-50 rounded-full border flex items-center justify-center text-indigo-400"><User size={20} /></div>}
                      <div>
                        <div className="font-bold text-lg flex items-center gap-2 text-gray-800">{pt.name} <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{pt.type}</span></div>
                        <div className="text-xs text-gray-500 mt-1">Base HbA1c: <span className="text-red-500 font-bold">{pt.initialHba1c}%</span> | {pt.age}세({pt.gender})</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleCopyPatient(pt)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"><Copy size={16} /></button>
                      <button onClick={() => setEditingPatient(pt)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Edit size={16} /></button>
                      <button onClick={() => deleteDocAdmin('patients', pt.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {editingPatient && editingPatient.isCopiedFromId === pt.id && renderPatForm(editingPatient)}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* --- MEDICATIONS TAB --- */}
        {tab === 'medications' && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold mb-4 text-indigo-900 border-b pb-2">📂 카테고리 관리</h3>
              <form onSubmit={async e => { e.preventDefault(); const n = e.target.cn.value.trim(); if (n) { await saveDoc('medCategories', { name: n, order: medCategories.length }, `cat_${Date.now()}`); e.target.reset(); } }} className="flex gap-2 mb-4">
                <input name="cn" placeholder="새 카테고리명" className={inputBase} required />
                <button type="submit" className="bg-indigo-600 text-white px-4 rounded-lg font-bold hover:bg-indigo-700 transition-colors">추가</button>
              </form>
              <div className="space-y-2">
                {medCategories.map((c, i) => (
                  <div key={c.id} draggable onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i, 'medCategories', medCategories)} className="flex justify-between bg-gray-50 p-2 rounded-lg border cursor-move">
                    <div className="flex gap-3 items-center"><GripVertical size={16} className="text-gray-300" /><span className="font-bold text-sm">📁 {c.name}</span></div>
                    <button onClick={() => deleteDocAdmin('medCategories', c.id)} className="text-red-400 p-1 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">처방약 마스터</h2>
              <div className="flex gap-2">
                <button onClick={handleLoadDefaultMedications} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm shadow hover:bg-emerald-700 transition-colors">60종 세팅</button>
                <button onClick={() => setEditingMed({ id: 'new', order: medications.length + 1, effect: 1, pkg: 'ptp', isNotDrug: false, sideEffectProb: 0, sideEffectPenalty: 0.2, allowHFrEFCoverage: false, allowHFpEFCoverage: false, allowCkdCoverage: false, isInsuranceException: false, egfrLimit: 0, allow2TQD: false })} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm shadow hover:bg-indigo-700 transition-colors">+ 직접 추가</button>
              </div>
            </div>

            {editingMed && editingMed.id === 'new' && renderMedForm(editingMed)}

            <div className="space-y-3">
              {medications.map((md, i) => (
                <React.Fragment key={md.id}>
                  {editingMed && editingMed.id === md.id && renderMedForm(editingMed)}
                  <div draggable onDragStart={() => handleDragStart(i)} onDragOver={handleDragOver} onDrop={() => handleDrop(i, 'medications', medications)} className="bg-white p-4 border rounded-2xl flex justify-between shadow-sm cursor-move hover:border-indigo-400 transition-all">
                    <div className="flex items-center gap-4">
                      <GripVertical className="text-gray-300" size={20} />
                      <div>
                        <div className="font-bold text-lg flex gap-2 mb-1 items-center flex-wrap text-gray-800">
                          {md.name}
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border">{md.isNotDrug ? '비약물' : (md.pkg === 'injection' ? '주사' : (md.pkg === 'bottle' || md.isPackaging ? '병' : 'PTP'))}</span>
                          {md.categoryId && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">📁 {medCategories.find(c => c.id === md.categoryId)?.name}</span>}
                          {md.isInsuranceException && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full shadow">🔥 예외</span>}
                          {md.allowHFrEFCoverage && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">심부전(&lt;40)</span>}
                          {md.allowHFpEFCoverage && <span className="text-[10px] bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded-full border border-cyan-100">심부전(&ge;40)</span>}
                          {md.allowCkdCoverage && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">신부전 특례</span>}
                          {md.allow2TQD && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-200">✌️ 2T QD</span>}
                        </div>
                        <div className="text-sm text-gray-500 font-medium">
                          효과: <span className="text-indigo-600 font-bold">{md.isNotDrug ? '-' : `-${md.effect}%`}</span> | eGFR하한: {md.egfrLimit || '없음'} | 계열: {(md.classes || []).map(c => drugClasses.find(x => x.id === c)?.name).join(', ') || '없음'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleCopyMed(md)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"><Copy size={16} /></button>
                      <button onClick={() => setEditingMed(md)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Edit size={16} /></button>
                      <button onClick={() => deleteDocAdmin('medications', md.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                    </div>
                  </div>
                  {editingMed && editingMed.isCopiedFromId === md.id && renderMedForm(editingMed)}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* --- CLASSES / RULES TAB --- */}
        {tab === 'classes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[350px]">
                <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-indigo-900"><AlertTriangle size={24} /> 단독/조합 규칙</h3>
                
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-6 shadow-sm">
                  <h4 className="text-sm font-bold text-indigo-700 mb-4">✨ 부작용 상쇄 조합 (시너지) 추가</h4>
                  <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target); const sel = []; drugClasses.forEach(c => { if (fd.get(`se_${c.id}`)) sel.push(c.id); }); if (sel.length > 0) saveDoc('sideEffectExemptions', { classes: sel, keyword: fd.get('se_kw').trim() }); e.target.reset(); }}>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {drugClasses.map(c => <label key={`se_${c.id}`} className="text-xs border px-2 py-1.5 rounded bg-white cursor-pointer font-bold hover:bg-indigo-50 transition-colors"><input type="checkbox" name={`se_${c.id}`} className="mr-1 align-middle" />{c.name}</label>)}
                    </div>
                    <input name="se_kw" placeholder="상쇄 키워드 (비워두면 모두 면제)" className="w-full p-2 border rounded text-xs mb-3 font-bold focus:border-indigo-400 focus:outline-none" />
                    <button className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors">등록</button>
                  </form>
                  <div className="mt-3 space-y-2">
                    {(sideEffectExemptions || []).map(ex => (
                      <div key={ex.id} className="bg-white border p-3 rounded-xl flex justify-between shadow-sm items-center">
                        <div>
                          <span className="font-bold text-indigo-800 block">✨ {ex.classes.map(c => drugClasses.find(d => d.id === c)?.name).join('+')}</span>
                          <span className="text-[10px] text-indigo-500 font-bold">{ex.keyword ? `'${ex.keyword}' 부작용 면제` : '모든 부작용 면제'}</span>
                        </div>
                        <button onClick={() => deleteDocAdmin('sideEffectExemptions', ex.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6 shadow-sm">
                  <h4 className="text-sm font-bold text-blue-600 mb-4">✅ 예외 허용 조합 추가</h4>
                  <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target); const sel = []; drugClasses.forEach(c => { if (fd.get(`ac_${c.id}`)) sel.push(c.id); }); if (sel.length > 0) saveDoc('allowedCombinations', { classes: sel }); e.target.reset(); }}>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {drugClasses.map(c => <label key={`ac_${c.id}`} className="text-xs border px-2 py-1.5 rounded bg-white cursor-pointer font-bold hover:bg-blue-50 transition-colors"><input type="checkbox" name={`ac_${c.id}`} className="mr-1 align-middle" />{c.name}</label>)}
                    </div>
                    <button className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold hover:bg-blue-600 transition-colors">등록</button>
                  </form>
                  <div className="mt-3 space-y-2">
                    {(allowedCombinations || []).map(ac => (
                      <div key={ac.id} className="bg-white border p-3 rounded-xl flex justify-between shadow-sm items-center">
                        <span className="font-bold text-blue-800">✅ {ac.classes.map(c => drugClasses.find(d => d.id === c)?.name).join('+')} 허용</span>
                        <button onClick={() => deleteDocAdmin('allowedCombinations', ac.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border rounded-2xl p-6 mb-6 shadow-sm">
                  <h4 className="text-sm font-bold text-red-600 mb-4">⛔ 삭감 규칙 추가</h4>
                  <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.target); const sel = []; drugClasses.forEach(c => { if (fd.get(`rc_${c.id}`)) sel.push(c.id); }); if (sel.length > 0) saveDoc('deductionRules', { classes: sel }); e.target.reset(); }}>
                    <div className="flex flex-wrap gap-2 mb-6">
                      {drugClasses.map(c => <label key={c.id} className="text-sm border px-3 py-2 rounded-lg bg-gray-50 cursor-pointer font-bold hover:bg-indigo-50 transition-colors"><input type="checkbox" name={`rc_${c.id}`} className="mr-2 align-middle" />{c.name}</label>)}
                    </div>
                    <button className="w-full bg-red-500 text-white py-4 rounded-xl font-bold hover:bg-red-600 transition-colors">등록</button>
                  </form>
                </div>
                <div className="space-y-3">
                  {(deductionRules || []).map(r => (
                    <div key={r.id} className="bg-red-50 border p-5 rounded-xl flex justify-between items-center shadow-sm">
                      <span className="font-bold text-red-800">{r.classes.length === 1 ? '🔴 단독 불가' : '⛔ 병용 금기'}<br /><span className="text-lg mt-1 block">{r.classes.map(c => drugClasses.find(d => d.id === c)?.name).join('+')}</span></span>
                      <button onClick={() => deleteDocAdmin('deductionRules', r.id)} className="text-red-500 p-3 bg-white rounded-lg shadow-sm hover:bg-red-100 transition-colors"><Trash2 size={20} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <div className="min-w-[350px]">
                <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-teal-900"><Activity size={24} /> 질환군 추가</h3>
                <form onSubmit={handleAddComorb} className="bg-teal-50 border border-teal-200 p-6 rounded-2xl mb-6 flex flex-col gap-4 shadow-sm">
                  {renderInput('질환명', 'name', newComorb.name, 'text')}
                  {renderInput('호전 시 텍스트', 'goodMsg', newComorb.goodMsg, 'text')}
                  {renderInput('악화 시 텍스트', 'badMsg', newComorb.badMsg, 'text')}
                  <button type="submit" className="bg-teal-600 text-white py-4 rounded-xl font-bold hover:bg-teal-700 shadow-md transition-colors">추가</button>
                </form>
                <div className="space-y-3">
                  {comorbidityList.map(c => (
                    <div key={c.name} className="bg-white border border-teal-100 p-5 rounded-xl flex justify-between shadow-sm items-center hover:border-teal-300 transition-colors">
                      <div className="pr-4">
                        <div className="font-black text-lg mb-2 text-teal-900">{c.name}</div>
                        <div className="text-sm text-gray-600 mb-1"><span className="text-blue-500 font-bold bg-blue-50 px-1 rounded mr-1">이점</span> {c.goodMsg}</div>
                        <div className="text-sm text-gray-600"><span className="text-red-500 font-bold bg-red-50 px-1 rounded mr-1">악화</span> {c.badMsg}</div>
                      </div>
                      <button onClick={() => handleDeleteComorb(c.name)} className="text-red-500 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={20} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PRIZES TAB --- */}
        {tab === 'prizes' && <PrizeManager prizes={prizes} db={db} appId={appId} customConfirm={customConfirm} customAlert={customAlert} />}

        {/* --- RECORDS TAB (DEDUCTION LOGS & SEARCH BAR INCLUDED) --- */}
        {tab === 'records' && (
          <div className="animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <h2 className="font-bold text-xl flex items-center gap-2 text-indigo-900 whitespace-nowrap"><Users className="text-indigo-500" /> 직원 ({allGameStates.length}명)</h2>
                {/* 🚨 사번 검색기능 추가 */}
                <div className="relative w-full md:w-64 ml-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="사번 검색..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl font-bold focus:outline-none focus:border-indigo-500 shadow-sm transition-colors text-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4 md:mt-0 w-full md:w-auto overflow-x-auto whitespace-nowrap pb-2 md:pb-0">
                <button onClick={handleExportPrizesCSV} className="bg-yellow-500 text-white px-4 py-2 font-bold rounded-xl shadow-md hover:bg-yellow-600 transition-colors text-sm">당첨 엑셀</button>
                <button onClick={handleExportDeductionsCSV} className="bg-orange-500 text-white px-4 py-2 font-bold rounded-xl shadow-md hover:bg-orange-600 transition-colors text-sm">삭감 엑셀</button>
                <button onClick={handleExportCSV} className="bg-green-600 text-white px-4 py-2 font-bold rounded-xl shadow-md hover:bg-green-700 transition-colors text-sm">전체 엑셀</button>
                <button onClick={handleResetAllData} className="bg-red-600 text-white px-4 py-2 font-bold rounded-xl shadow-md hover:bg-red-700 transition-colors text-sm">월말 전체 초기화</button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
              {filteredGameStates.map(st => (
                <div key={st.id} className="border p-5 bg-white relative rounded-2xl shadow-sm hover:border-indigo-300 transition-colors flex flex-col">
                  <button onClick={() => deleteEmployee(st.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 p-2 bg-gray-50 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center font-bold shadow-inner"><User size={24} /></div>
                    <div><p className="font-black text-xl text-indigo-900">{st.empId}</p><p className="text-sm text-gray-500 font-bold">{st.day}일차 진행중</p></div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border flex justify-around mb-4 text-center shadow-inner">
                    <div><p className="text-xs text-gray-500 font-bold mb-1">연속출석</p><p className="font-black text-orange-500 text-lg">{st.streak}일</p></div>
                    <div><p className="text-xs text-gray-500 font-bold mb-1">점수</p><p className="font-black text-blue-500 text-lg">{st.score}점</p></div>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-2 min-h-0">
                    <div className="bg-white border border-yellow-200 p-3 rounded-xl flex-1 overflow-y-auto custom-scrollbar min-h-[100px]">
                      <p className="text-xs font-bold text-yellow-600 mb-2 border-b border-yellow-100 pb-1">🎁 당첨 내역</p>
                      {(st.prizeLogs || []).map(pl => (
                        <div key={pl.id} className="flex justify-between items-center bg-yellow-50 p-1.5 rounded mb-1 cursor-pointer hover:bg-red-50 transition-colors" onClick={() => customConfirm('이 당첨 기록을 취소합니까?', async () => { try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gamestates', st.id), { prizeLogs: st.prizeLogs.filter(l => l.id !== pl.id) }); } catch (err) { } })}>
                          <span className="font-bold text-[11px] text-yellow-800 truncate">{pl.day}일차: {pl.prizeName}</span><Trash2 size={12} className="text-red-300 shrink-0" />
                        </div>
                      ))}
                      {!(st.prizeLogs?.length > 0) && <p className="text-[10px] text-gray-400 text-center py-2">당첨 없음</p>}
                    </div>

                    <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex-1 overflow-y-auto custom-scrollbar min-h-[100px]">
                      <p className="text-xs font-bold text-red-600 mb-2 border-b border-red-100 pb-1">⚠️ 삭감 내역</p>
                      {(st.deductionLogs || []).map(dl => (
                        <div key={dl.id} className="bg-white p-2 rounded mb-2 shadow-sm">
                          <div className="font-bold text-[10px] text-red-700">{dl.day}일차 - {dl.patientName}</div>
                          <div className="text-[9px] text-red-500 mt-0.5 truncate">{dl.drugName}</div>
                          <ul className="text-[9px] text-red-600 list-disc pl-3 mt-1 space-y-0.5">
                            {dl.reasons.map((r, i) => <li key={i} className="leading-tight">{r}</li>)}
                          </ul>
                        </div>
                      ))}
                      {!(st.deductionLogs?.length > 0) && <p className="text-[10px] text-gray-400 text-center py-2">삭감 없음</p>}
                    </div>
                  </div>
                </div>
              ))}
              {filteredGameStates.length === 0 && (
                <div className="col-span-full py-12 text-center bg-white border rounded-3xl shadow-sm">
                  <Users size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-bold text-lg">해당하는 직원이 없습니다.</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800"><FileText className="text-blue-500" /> 검색된 처방 로그</h3>
              <div className="overflow-x-auto max-h-[500px] border rounded-2xl shadow-sm bg-white custom-scrollbar">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                    <tr><th className="p-4 font-bold border-b text-gray-600">일차</th><th className="p-4 font-bold border-b text-gray-600">사번</th><th className="p-4 font-bold border-b text-gray-600">환자</th><th className="p-4 font-bold border-b text-gray-600">결과</th><th className="p-4 text-center font-bold border-b text-gray-600">관리</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredGameStates.flatMap(s => (s.logs || []).map(l => ({ ...l, empId: s.empId }))).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map((l, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-bold text-gray-500 whitespace-nowrap">{l.day}일</td>
                        <td className="p-4 font-black text-indigo-700 whitespace-nowrap">{l.empId}</td>
                        <td className="p-4 font-bold whitespace-nowrap">{l.patientName}</td>
                        <td className="p-4">
                          <span className="text-green-700 font-bold block mb-1">{l.drugName}</span>
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">{l.newHba1c}%</span>
                          {l.patientFeedback && <div className="text-xs text-gray-500 mt-2 bg-gray-100 p-1.5 rounded border border-gray-200">"{l.patientFeedback}"</div>}
                        </td>
                        <td className="p-4 text-center">
                          <button onClick={() => handleDeleteLogAdmin(l.empId, l.id, l.patientId, l.day)} className="text-gray-400 hover:text-red-500 p-2 bg-white rounded border shadow-sm transition-colors"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredGameStates.flatMap(s => s.logs || []).length === 0 && (
                      <tr><td colSpan="5" className="p-8 text-center text-gray-400 font-bold">기록된 처방 로그가 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      <CustomModal config={confirmConfig} onClose={() => setConfirmConfig(null)} />
    </div>
  );
}