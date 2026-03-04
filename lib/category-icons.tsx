import { icons, type LucideIcon } from "lucide-react";

// Cast icons to Record<string, LucideIcon> for dynamic access
const iconMap = icons as Record<string, LucideIcon>;

// Re-export the full icons map
export const allIcons = iconMap;

// Get all icon names as array
export const allIconNames = Object.keys(iconMap);

/**
 * Lấy Lucide icon component từ tên icon (string).
 * Fallback về Newspaper nếu không tìm thấy.
 */
export function getCategoryIcon(iconName?: string): LucideIcon {
    if (!iconName) return iconMap.Newspaper;
    return iconMap[iconName] || iconMap.Newspaper;
}

/**
 * Render Lucide icon component từ tên icon (string).
 * Dùng trong JSX: <CategoryIcon name="Trophy" className="w-4 h-4" />
 */
export function CategoryIcon({
    name,
    className,
    style,
}: {
    name?: string;
    className?: string;
    style?: React.CSSProperties;
}) {
    const Icon = getCategoryIcon(name);
    return <Icon className={className} style={style} />;
}

export default iconMap;
