import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, Plus, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSupabaseCoupons } from "@/hooks/useSupabaseCoupons";
import { supabase } from "@/integrations/supabase/client";

interface Coupon {
  id: string;
  code: string;
  discount_kind: 'percent' | 'fixed';
  discount_value: number;
  expiration_date?: string;
  usage_limit?: number;
  used_count: number;
  minimum_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CouponManagement = () => {
  const { coupons, loading, refetch } = useSupabaseCoupons();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [deleteCouponId, setDeleteCouponId] = useState<string | null>(null);
  
  const [couponFormData, setCouponFormData] = useState<{
    code: string;
    discount_kind: 'percent' | 'fixed';
    discount_value: number;
    expiration_date?: string;
    usage_limit?: number;
    minimum_amount: number;
    is_active: boolean;
  }>({
    code: '',
    discount_kind: 'percent',
    discount_value: 10,
    expiration_date: undefined,
    usage_limit: undefined,
    minimum_amount: 0,
    is_active: true,
  });

  const resetFormData = () => {
    setCouponFormData({
      code: '',
      discount_kind: 'percent',
      discount_value: 10,
      expiration_date: undefined,
      usage_limit: undefined,
      minimum_amount: 0,
      is_active: true,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setCouponFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else if (name === 'discount_value' || name === 'usage_limit' || name === 'minimum_amount') {
      setCouponFormData(prev => ({
        ...prev,
        [name]: value === '' ? (name === 'minimum_amount' ? 0 : undefined) : Number(value),
      }));
    } else {
      setCouponFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddCoupon = async () => {
    try {
      if (!couponFormData.code.trim()) {
        toast.error('Please enter a coupon code');
        return;
      }

      const insertData: any = {
        code: couponFormData.code.toUpperCase().trim(),
        discount_kind: couponFormData.discount_kind,
        discount_value: couponFormData.discount_value,
        minimum_amount: couponFormData.minimum_amount,
        is_active: couponFormData.is_active,
        used_count: 0
      };

      if (couponFormData.expiration_date) {
        insertData.expiration_date = couponFormData.expiration_date;
      }

      if (couponFormData.usage_limit) {
        insertData.usage_limit = couponFormData.usage_limit;
      }

      const { data, error } = await supabase
        .from('coupons')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Coupon added successfully:', data);
      toast.success("تم إضافة كوبون الخصم بنجاح");
      setShowAddDialog(false);
      resetFormData();
      refetch();
    } catch (error: any) {
      console.error("Error adding coupon:", error);
      toast.error(error.message || "فشل في إضافة كوبون الخصم");
    }
  };

  const handleEditCoupon = async () => {
    if (!editCoupon) return;
    try {
      const updateData: any = {
        code: couponFormData.code.toUpperCase().trim(),
        discount_kind: couponFormData.discount_kind,
        discount_value: couponFormData.discount_value,
        minimum_amount: couponFormData.minimum_amount,
        is_active: couponFormData.is_active
      };

      if (couponFormData.expiration_date) {
        updateData.expiration_date = couponFormData.expiration_date;
      }

      if (couponFormData.usage_limit) {
        updateData.usage_limit = couponFormData.usage_limit;
      }

      const { data, error } = await supabase
        .from('coupons')
        .update(updateData)
        .eq('id', editCoupon.id)
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Coupon updated successfully:', data);
      toast.success("تم تحديث كوبون الخصم بنجاح");
      setShowEditDialog(false);
      setEditCoupon(null);
      resetFormData();
      refetch();
    } catch (error: any) {
      console.error("Error updating coupon:", error);
      toast.error(error.message || "فشل في تحديث كوبون الخصم");
    }
  };

  const handleDeleteCoupon = async () => {
    if (!deleteCouponId) return;
    try {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', deleteCouponId);

      if (error) throw error;

      console.log('✅ Coupon deleted successfully');
      toast.success("تم حذف كوبون الخصم بنجاح");
      setShowDeleteDialog(false);
      setDeleteCouponId(null);
      refetch();
    } catch (error: any) {
      console.error("Error deleting coupon:", error);
      toast.error("فشل في حذف كوبون الخصم");
    }
  };

  const openEditDialog = (coupon: Coupon) => {
    setEditCoupon(coupon);
    setCouponFormData({
      code: coupon.code,
      discount_kind: coupon.discount_kind,
      discount_value: coupon.discount_value,
      expiration_date: coupon.expiration_date ? new Date(coupon.expiration_date).toISOString().split('T')[0] : undefined,
      usage_limit: coupon.usage_limit,
      minimum_amount: coupon.minimum_amount,
      is_active: coupon.is_active,
    });
    setShowEditDialog(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch {
      return 'Invalid Date';
    }
  };

  const isCouponActive = (coupon: Coupon) => {
    const now = new Date();
    return (
      coupon.is_active &&
      (!coupon.expiration_date || new Date(coupon.expiration_date) >= now) &&
      (!coupon.usage_limit || coupon.used_count < coupon.usage_limit)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h2 className="text-xl font-bold">إدارة كوبونات الخصم</h2>
        <Button
          onClick={() => {
            resetFormData();
            setShowAddDialog(true);
          }}
          className="bg-green-800 hover:bg-green-900 text-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> إضافة كوبون جديد
        </Button>
      </div>

      <Card className="border-green-100">
        <CardHeader className="bg-gradient-to-r from-green-900 to-black text-white">
          <CardTitle className="text-xl">كوبونات الخصم</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-800"></div>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">لا يوجد كوبونات خصم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-green-50">
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>القيمة</TableHead>
                    <TableHead className="hidden md:table-cell">انتهاء الصلاحية</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="hidden lg:table-cell">الاستخدامات</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map(coupon => (
                    <TableRow key={coupon.id} className="hover:bg-green-50 transition-colors">
                      <TableCell className="font-bold">{coupon.code}</TableCell>
                      <TableCell>{coupon.discount_kind === 'percent' ? 'نسبة مئوية' : 'مبلغ ثابت'}</TableCell>
                      <TableCell>
                        {coupon.discount_value}{coupon.discount_kind === 'percent' ? '%' : ' EGP'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {coupon.expiration_date ? formatDate(coupon.expiration_date) : 'بدون انتهاء'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            isCouponActive(coupon)
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }
                        >
                          {isCouponActive(coupon) ? 'مفعل' : 'غير مفعل'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {coupon.used_count} {coupon.usage_limit ? `/ ${coupon.usage_limit}` : ''}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => openEditDialog(coupon)}
                            className="bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 p-1 h-auto"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setDeleteCouponId(coupon.id);
                              setShowDeleteDialog(true);
                            }}
                            className="bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 text-red-600 p-1 h-auto"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Coupon Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة كوبون خصم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">كود الخصم*</label>
                <input
                  type="text"
                  name="code"
                  value={couponFormData.code}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="مثال: SUMMER2025"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">نوع الخصم*</label>
                  <select
                    name="discount_kind"
                    value={couponFormData.discount_kind}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm"
                    required
                  >
                    <option value="percent">نسبة مئوية</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">قيمة الخصم*</label>
                  <input
                    type="number"
                    name="discount_value"
                    min="1"
                    value={couponFormData.discount_value}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">تاريخ انتهاء الصلاحية</label>
                <input
                  type="date"
                  name="expiration_date"
                  value={couponFormData.expiration_date || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">الحد الأقصى للاستخدام</label>
                  <input
                    type="number"
                    name="usage_limit"
                    min="1"
                    value={couponFormData.usage_limit || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="غير محدود"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الحد الأدنى للطلب</label>
                  <input
                    type="number"
                    name="minimum_amount"
                    min="0"
                    value={couponFormData.minimum_amount}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={couponFormData.is_active}
                  onChange={handleInputChange}
                  id="isActive"
                  className="mr-2"
                />
                <label htmlFor="isActive">مفعل</label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="button" onClick={() => setShowAddDialog(false)} className="w-full sm:w-auto">
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleAddCoupon}
              className="w-full sm:w-auto bg-green-700 hover:bg-green-800"
            >
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل كوبون الخصم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">كود الخصم*</label>
                <input
                  type="text"
                  name="code"
                  value={couponFormData.code}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm"
                  placeholder="مثال: SUMMER2025"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">نوع الخصم*</label>
                  <select
                    name="discount_kind"
                    value={couponFormData.discount_kind}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm"
                    required
                  >
                    <option value="percent">نسبة مئوية</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">قيمة الخصم*</label>
                  <input
                    type="number"
                    name="discount_value"
                    min="1"
                    value={couponFormData.discount_value}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">تاريخ انتهاء الصلاحية</label>
                <input
                  type="date"
                  name="expiration_date"
                  value={couponFormData.expiration_date || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">الحد الأقصى للاستخدام</label>
                  <input
                    type="number"
                    name="usage_limit"
                    min="1"
                    value={couponFormData.usage_limit || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="غير محدود"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الحد الأدنى للطلب</label>
                  <input
                    type="number"
                    name="minimum_amount"
                    min="0"
                    value={couponFormData.minimum_amount}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={couponFormData.is_active}
                  onChange={handleInputChange}
                  id="editIsActive"
                  className="mr-2"
                />
                <label htmlFor="editIsActive">مفعل</label>
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="button" onClick={() => setShowEditDialog(false)} className="w-full sm:w-auto">
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleEditCoupon}
              className="w-full sm:w-auto bg-green-700 hover:bg-green-800"
            >
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Coupon Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>حذف كوبون الخصم</DialogTitle>
          </DialogHeader>
          <p>هل أنت متأكد أنك تريد حذف هذا الكوبون؟ لا يمكن التراجع عن هذا الإجراء.</p>
          <DialogFooter>
            <Button type="button" onClick={() => setShowDeleteDialog(false)}>
              إلغاء
            </Button>
            <Button
              type="button"
              onClick={handleDeleteCoupon}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CouponManagement;
