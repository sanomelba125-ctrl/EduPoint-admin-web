import request from '@/utils/request'

export interface CertificateItem {
  id: number
  certificateNo: string
  studentName: string
  studentNo: string
  activityTitle: string
  title: string
  issuer: string
  issueTime: string
  fileUrl?: string
  status: number // 1-有效, 2-已撤销, 3-已过期
  revokeReason?: string
  verifyCount?: number
}

export interface CertificateQueryParams {
  page?: number
  size?: number
  certificateNo?: string
  studentName?: string
  studentNo?: string
  activityTitle?: string
  status?: number | string
}

export interface CertificateVerifyResult {
  certificateNo: string
  studentNameMasked: string // 如 张*
  title: string
  activityTitle: string
  issuer: string
  issueTime: string
  status: number
  statusText: string
  revokeReason?: string
  verifyTime: string
}

// 前端写死内置 Mock 数据台账（待后端接口完成后无缝对接）
const mockCertificates: CertificateItem[] = [
  {
    id: 1,
    certificateNo: 'CERT-2026-ACT2-A89F3B12',
    studentName: '张晓明',
    studentNo: '2023010401',
    activityTitle: '“青年AI与新质生产力”前沿学术讲座',
    title: '青年AI前沿学术讲座结业证书',
    issuer: '校科技创新协会',
    issueTime: '2026-03-01 17:00:00',
    fileUrl: 'https://images.unsplash.com/photo-1589330694653-dad6bc01cf0f?w=600',
    status: 1,
    verifyCount: 18
  },
  {
    id: 2,
    certificateNo: 'CERT-2026-ACT1-C45D10E9',
    studentName: '张伟',
    studentNo: '20220101',
    activityTitle: '2026春季校园阳光晨跑打卡挑战',
    title: '晨跑挑战优秀先锋荣誉证书',
    issuer: '校体育运动委员会',
    issueTime: '2026-03-05 08:30:00',
    fileUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600',
    status: 1,
    verifyCount: 7
  },
  {
    id: 3,
    certificateNo: 'CERT-2026-ACT4-98F123AB',
    studentName: '王芳',
    studentNo: '20220102',
    activityTitle: '图书馆学术资源检索与文献管理实训',
    title: '学术文献素养训练合格证书',
    issuer: '校图书馆学工办',
    issueTime: '2026-03-08 16:00:00',
    fileUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600',
    status: 1,
    verifyCount: 4
  },
  {
    id: 4,
    certificateNo: 'CERT-2026-ACT3-REVOKED01',
    studentName: '孙浩',
    studentNo: '20220105',
    activityTitle: '全国大学生计算机系统能力初赛辅导',
    title: '计算机系统竞赛集训结项证书',
    issuer: '计算机工程学院',
    issueTime: '2026-02-28 12:00:00',
    fileUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600',
    status: 2,
    revokeReason: '学生因违反竞赛作弊纪律，经学术委员会核定撤销证书',
    verifyCount: 15
  },
  {
    id: 5,
    certificateNo: 'CERT-2026-ACT5-77B21C89',
    studentName: '陈明',
    studentNo: '20220103',
    activityTitle: '创客快速成型与3D打印实训工坊',
    title: '创客工坊技能认证证书',
    issuer: '创新创业学院',
    issueTime: '2026-03-07 18:20:00',
    fileUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600',
    status: 1,
    verifyCount: 9
  },
  {
    id: 6,
    certificateNo: 'CERT-2026-ACT6-EXP0988A',
    studentName: '赵丽',
    studentNo: '20220104',
    activityTitle: '校园模拟联合国大会体验营',
    title: '模拟联合国营队代表证书',
    issuer: '校团委素质拓展部',
    issueTime: '2025-12-15 15:00:00',
    fileUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600',
    status: 3,
    verifyCount: 2
  }
]

/**
 * 8.3 管理端分页查询电子荣誉证书台账
 */
export async function getCertificateListApi(params: CertificateQueryParams) {
  try {
    const res: any = await request.get('/certificate/list', { params })
    if (res && res.code === 200 && res.data) {
      return res.data
    }
  } catch (error) {
    // 后端接口未就绪时自动平滑回退至本地 Mock 数据
  }

  // 本地过滤与分页实现
  const page = params.page || 1
  const size = params.size || 10

  let filtered = [...mockCertificates]

  if (params.certificateNo) {
    const q = params.certificateNo.trim().toUpperCase()
    filtered = filtered.filter(item => item.certificateNo.toUpperCase().includes(q))
  }
  if (params.studentName) {
    const q = params.studentName.trim()
    filtered = filtered.filter(item => item.studentName.includes(q))
  }
  if (params.studentNo) {
    const q = params.studentNo.trim()
    filtered = filtered.filter(item => item.studentNo.includes(q))
  }
  if (params.activityTitle) {
    const q = params.activityTitle.trim()
    filtered = filtered.filter(item => item.activityTitle.includes(q) || item.title.includes(q))
  }
  if (params.status !== undefined && params.status !== '') {
    filtered = filtered.filter(item => item.status === Number(params.status))
  }

  const total = filtered.length
  const startIndex = (page - 1) * size
  const records = filtered.slice(startIndex, startIndex + size)

  return {
    records,
    total,
    page,
    size
  }
}

/**
 * 8.4 管理端撤销电子荣誉证书 (Revoke)
 */
export async function revokeCertificateApi(id: number, revokeReason: string) {
  try {
    const res: any = await request.put(`/certificate/${id}/revoke`, { revokeReason })
    if (res && res.code === 200) {
      return res.data
    }
  } catch (error) {
    // 接口未就绪，本地状态撤销
  }

  const target = mockCertificates.find(c => c.id === id)
  if (target) {
    target.status = 2
    target.revokeReason = revokeReason
    return true
  }
  throw new Error('未找到该证书')
}

/**
 * 8.2 公开扫码验真证书（真伪核验）
 */
export async function verifyCertificateApi(certificateNo: string): Promise<CertificateVerifyResult> {
  try {
    const res: any = await request.get(`/certificate/verify/${certificateNo}`)
    if (res && res.code === 200 && res.data) {
      return res.data
    }
  } catch (error) {
    // 接口未就绪，本地校验
  }

  const target = mockCertificates.find(c => c.certificateNo.toUpperCase() === certificateNo.trim().toUpperCase())
  if (!target) {
    throw new Error('未检索到此防伪证书编号，请核实后重试')
  }

  // 姓名脱敏
  const name = target.studentName
  const maskedName = name.length > 2 ? `${name[0]}*${name[name.length - 1]}` : `${name[0]}*`

  let statusText = '有效 (VALID)'
  if (target.status === 2) statusText = '已作废撤销 (REVOKED)'
  else if (target.status === 3) statusText = '已过期 (EXPIRED)'

  return {
    certificateNo: target.certificateNo,
    studentNameMasked: maskedName,
    title: target.title,
    activityTitle: target.activityTitle,
    issuer: target.issuer,
    issueTime: target.issueTime,
    status: target.status,
    statusText,
    revokeReason: target.revokeReason,
    verifyTime: new Date().toLocaleString()
  }
}
