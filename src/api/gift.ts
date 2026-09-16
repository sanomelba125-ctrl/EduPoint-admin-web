import { http } from '@/utils/request'
import type { PageQuery, PageResult } from './types'

export interface GiftVO {
  id: number
  name: string
  description?: string
  image?: string
  pointsCost: number
  pointsRequired?: number
  stock: number
  totalStock?: number
  version: number
  status: number // 0-下架 1-上架
  createTime?: string
  updateTime?: string
}

export interface GiftCreateDTO {
  name: string
  description?: string
  image?: string
  pointsCost?: number
  pointsRequired?: number
  stock?: number
  totalStock?: number
  status?: number
}

export interface GiftUpdateDTO {
  id: number
  name: string
  description?: string
  image?: string
  pointsCost?: number
  pointsRequired?: number
  status?: number
}

export interface GiftQuery extends PageQuery {
  name?: string
  keyword?: string
  status?: number | string
}

export interface StudentGiftVO {
  id: number
  orderNo: string
  studentId: number
  giftId: number
  quantity: number
  pointsCost: number
  receiverName?: string
  receiverPhone?: string
  receiverAddress?: string
  pickupCode: string
  status: number // 1-待提货 2-已送达/核销 3-已取消
  refundPointsStatus: number // 0-未退 1-已退还
  deliveryTime?: string
  cancelTime?: string
  cancelReason?: string
  operatorId?: number
  remark?: string
  createTime: string
  giftName?: string
  giftImage?: string
  studentNo?: string
  studentName?: string
  className?: string
}

export interface GiftOrderQuery extends PageQuery {
  orderNo?: string
  pickupCode?: string
  studentName?: string
  studentNo?: string
  status?: number | string
}

export interface DeliveryConfirmDTO {
  orderId: number
  pickupCode: string
  remark?: string
}

export interface OrderCancelDTO {
  orderId: number
  cancelReason?: string
  refundPoints?: boolean
}

/**
 * 分页获取礼品列表 (GET /api/gift/list)
 */
export function getGiftList(params: GiftQuery): Promise<PageResult<GiftVO>> {
  return http.get<PageResult<GiftVO>>('/gift/list', params)
}

/**
 * 根据 ID 获取礼品详情 (GET /api/gift/{id})
 */
export function getGiftById(id: number): Promise<GiftVO> {
  return http.get<GiftVO>(`/gift/${id}`)
}

/**
 * 上架新礼品 (POST /api/gift/create)
 */
export function createGift(data: GiftCreateDTO): Promise<GiftVO> {
  return http.post<GiftVO>('/gift/create', data)
}

/**
 * 修改礼品信息 (PUT /api/gift/update)
 * 仅维护基础信息，库存不在此接口变更
 */
export function updateGift(data: GiftUpdateDTO): Promise<GiftVO> {
  return http.put<GiftVO>('/gift/update', data)
}

/**
 * 礼品补货：入库总量与可用库存同步增加 (POST /api/gift/{id}/restock?quantity=N)
 */
export function restockGift(id: number, quantity: number): Promise<GiftVO> {
  return http.post<GiftVO>(`/gift/${id}/restock`, null, { params: { quantity } })
}

/**
 * 删除礼品 (DELETE /api/gift/{id})
 */
export function deleteGift(id: number): Promise<void> {
  return http.delete<void>(`/gift/${id}`)
}

/**
 * 上架 / 下架状态切换 (PUT /api/gift/{id}/status/{status})
 */
export function toggleGiftStatus(id: number, status: number): Promise<void> {
  return http.put<void>(`/gift/${id}/status/${status}`)
}

/**
 * 分页查询兑换订单 (GET /api/gift/order/list)
 */
export function getGiftOrderList(params: GiftOrderQuery): Promise<PageResult<StudentGiftVO>> {
  return http.get<PageResult<StudentGiftVO>>('/gift/order/list', params)
}

/**
 * 现场核销提货码并确认发放 (POST /api/gift/deliver)
 */
export function confirmDelivery(data: DeliveryConfirmDTO): Promise<void> {
  return http.post<void>('/gift/deliver', data)
}

/**
 * 管理端取消订单并退款 (POST /api/gift/order/cancel)
 */
export function cancelGiftOrder(data: OrderCancelDTO): Promise<void> {
  return http.post<void>('/gift/order/cancel', data)
}

