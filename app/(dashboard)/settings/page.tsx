import Link from 'next/link'
import {
  ArrowRightLeft,
  Building2,
  ChevronRight,
  Factory,
  KeyRound,
  FileText,
  BriefcaseBusiness,
  Sparkles,
  Users,
} from 'lucide-react'

export default function SettingsPage() {
  const items = [
    {
      href: '/settings/users',
      label: 'Người dùng',
      description: 'Quản lý tài khoản, vai trò và bộ phận',
      icon: Users,
    },
    {
      href: '/settings/company',
      label: 'Công ty / nhà máy',
      description: 'Quản lý danh sách nhà máy, HQ và mã nhận diện',
      icon: Factory,
    },
    {
      href: '/settings/departments',
      label: 'Bộ phận',
      description: 'Quản lý danh sách bộ phận dùng trong tài liệu và NCR',
      icon: Building2,
    },
    {
      href: '/settings/jobs',
      label: 'Vị trí công việc',
      description: 'Cấu hình vị trí công việc và kế hoạch checklist tháng',
      icon: BriefcaseBusiness,
    },
    {
      href: '/settings/cross-audit',
      label: 'Kiểm tra chéo',
      description: 'Chọn quy trình nào của mỗi bộ phận sẽ được kiểm tra chéo',
      icon: ArrowRightLeft,
    },
    {
      href: '/settings/templates',
      label: 'Mẫu tài liệu',
      description: 'Lưu form chuẩn để AI tạo và nhập tài liệu đúng định dạng',
      icon: FileText,
    },
    {
      href: '/settings/ai-prompts',
      label: 'Prompt AI',
      description: 'Chỉnh prompt tạo summary, quiz và checklist kiểm toán',
      icon: Sparkles,
    },
    {
      href: '/settings/password',
      label: 'Đổi mật khẩu',
      description: 'Cập nhật mật khẩu đăng nhập cá nhân',
      icon: KeyRound,
    },
  ]

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {items.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="text-gray-500 shrink-0">
              <Icon size={24} strokeWidth={1.6} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
