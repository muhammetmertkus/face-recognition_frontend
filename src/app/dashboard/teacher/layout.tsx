"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react' // useRef ve Suspense eklendi
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users, BookOpen, ClipboardCheck, Settings,
    LogOut, Menu, ChevronRight, ChevronLeft,
    PlusCircle, Home, User, Calendar, Clock, Moon, Sun, Globe, X // X ikonu eklendi (Popover kapatma için)
} from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

// --- ThemeToggleButton (Değişiklik Yok) ---
interface ThemeToggleButtonProps {
    theme: string | undefined;
    toggleTheme: () => void;
    t: (key: string) => string;
}
const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({ theme, toggleTheme, t }) => {
    // ... (Önceki kod ile aynı)
    const spring = { type: "spring", stiffness: 500, damping: 40 };
    const stars = [ { top: '20%', left: '60%', scale: 0.6, delay: 0.1 }, { top: '30%', left: '80%', scale: 0.4, delay: 0.3 }, { top: '50%', left: '70%', scale: 0.5, delay: 0.5 }, { top: '65%', left: '85%', scale: 0.3, delay: 0.2 }, ];
    return ( <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleTheme} className={cn( "relative flex items-center justify-between w-20 h-10 rounded-full p-1 cursor-pointer overflow-hidden", "bg-[url('/images/mountain-bg.png')] bg-cover bg-no-repeat", "transition-all duration-700 ease-in-out shadow-sm border border-gray-300 dark:border-gray-700" )} style={{ backgroundPosition: theme === 'dark' ? 'right center' : 'left center', }} aria-label={theme === 'dark' ? t('theme.lightMode') : t('theme.darkMode')} title={theme === 'dark' ? t('theme.lightMode') : t('theme.darkMode')} > <AnimatePresence> {theme === 'dark' && stars.map((star, i) => ( <motion.div key={`star-${i}`} className="absolute rounded-full bg-white/80 shadow-sm" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: [0, 0.8, 0], scale: star.scale, transition: { delay: star.delay, duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } }} exit={{ opacity: 0, scale: 0 }} style={{ top: star.top, left: star.left, width: `${star.scale * 5}px`, height: `${star.scale * 5}px`, }} /> ))} </AnimatePresence> <motion.div className="absolute left-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-lg" layout transition={spring} style={{ x: theme === 'dark' ? 2 : 42 }} > <AnimatePresence mode="wait" initial={false}> <motion.span key={theme === 'dark' ? 'moon' : 'sun'} initial={{ y: -15, opacity: 0, rotate: -60 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 15, opacity: 0, rotate: 60 }} transition={{ duration: 0.3, ease: "easeOut" }} className="flex items-center justify-center" > {theme === 'dark' ? ( <Moon className="h-5 w-5 text-slate-500" /> ) : ( <Sun className="h-5 w-5 text-yellow-500" /> )} </motion.span> </AnimatePresence> </motion.div> </motion.button> );
};

// --- SidebarItemProps (Değişiklik Yok) ---
interface SidebarItemProps {
    icon: React.ReactNode
    label: string
    href: string
    isActive: boolean
    isExpanded: boolean
    hasSubmenu?: boolean
    onClick?: () => void // Genel onClick
    onPopoverToggle?: () => void // Popover açma/kapama için özel prop
    isPopoverOpen?: boolean // Bu item'in popover'ı açık mı?
}

// --- SubmenuItemProps (Değişiklik Yok) ---
interface SubmenuItemProps {
    icon: React.ReactNode
    label: string
    href: string
    isActive: boolean
    onClick?: () => void
}


export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { logout, user } = useAuth()
    const { theme, setTheme } = useTheme()
    const { t, i18n } = useTranslation()
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [openPopoverMenu, setOpenPopoverMenu] = useState<string | null>(null); // Popover state'i

    // Ref'ler popover dışına tıklamayı algılamak için (isteğe bağlı, overlay daha basit olabilir)
    const popoverRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);

    // i18n durumunu kontrol etmek için log eklendi
    useEffect(() => {
        console.log("TeacherLayout i18n status:", {
            isInitialized: i18n.isInitialized,
            language: i18n.language,
            languages: i18n.languages,
            resource: i18n.getResource(i18n.language, 'translation', 'sidebar.home') // Örnek bir anahtarı kontrol et
        });
    }, [i18n, i18n.isInitialized, i18n.language]); // Bağımlılıklar eklendi

    useEffect(() => {
        const handleResize = () => {
            const shouldBeCollapsed = window.innerWidth < 1024;
            if (shouldBeCollapsed) {
                setIsSidebarExpanded(false);
                setOpenPopoverMenu(null); // Ekran küçülünce popover'ları kapat
            } else {
                setIsSidebarExpanded(true);
            }
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Popover dışına tıklamayı dinle (Overlay Alternatifi)
    // useEffect(() => {
    //     function handleClickOutside(event: MouseEvent) {
    //         if (
    //             openPopoverMenu &&
    //             sidebarRef.current &&
    //             !sidebarRef.current.contains(event.target as Node)
    //         ) {
    //            // Eğer tıklama sidebar'ın tamamen dışındaysa kapat
    //            // Daha hassas kontrol için: popoverRef.current && !popoverRef.current.contains(event.target as Node) && tetikleyici_buton_ref_kontrolu
    //            setOpenPopoverMenu(null);
    //         }
    //     }
    //     if (openPopoverMenu) {
    //         document.addEventListener("mousedown", handleClickOutside);
    //     } else {
    //         document.removeEventListener("mousedown", handleClickOutside);
    //     }
    //     return () => {
    //         document.removeEventListener("mousedown", handleClickOutside);
    //     };
    // }, [openPopoverMenu]); // openPopoverMenu değiştiğinde effect'i yeniden çalıştır

    useEffect(() => {
        setMounted(true)
    }, [])

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen)
        setOpenPopoverMenu(null); // Mobil menü açılıp kapanınca popover'ları kapat
    }

    const toggleSidebar = () => {
        const newState = !isSidebarExpanded;
        setIsSidebarExpanded(newState);
        setActiveSubmenu(null); // Normal alt menüleri kapat
        if (newState) { // Eğer genişliyorsa popover'ı kapat
             setOpenPopoverMenu(null);
        }
    }

    const toggleSubmenu = (key: string) => {
        // Geniş modda normal alt menü açma/kapama
        setActiveSubmenu(activeSubmenu === key ? null : key)
        setOpenPopoverMenu(null); // Normal alt menü açılınca popover'ı kapat
    }

    const togglePopoverMenu = (key: string) => {
        // Dar modda popover açma/kapama
        setOpenPopoverMenu(openPopoverMenu === key ? null : key);
        setActiveSubmenu(null); // Popover açılınca normal alt menüyü kapat (zaten kapalı olmalı)
    }


    const closeAllMenus = () => {
        setOpenPopoverMenu(null);
        setActiveSubmenu(null);
        if (isMobileMenuOpen) {
            toggleMobileMenu();
        }
    }

    // Global i18n ile dili değiştir
    const toggleLanguage = () => {
        const nextLang = i18n.language === 'tr' ? 'en' : 'tr';
        i18n.changeLanguage(nextLang);
        // localStorage'a kaydetme artık useEffect içinde yapılıyor
    }

    const flagSize = "w-5 h-5 rounded-full object-cover";

    // Sidebar Items (Değişiklik Yok)
    const sidebarItems = [ { icon: <Home size={20} />, label: 'sidebar.home', href: '/dashboard/teacher', submenu: null }, { icon: <BookOpen size={20} />, label: 'sidebar.courses', href: '/dashboard/teacher/courses', submenu: [ { icon: <PlusCircle size={18} />, label: 'sidebar.coursesNew', href: '/dashboard/teacher/courses/new' }, { icon: <BookOpen size={18} />, label: 'sidebar.coursesList', href: '/dashboard/teacher/courses' } ] }, { icon: <ClipboardCheck size={20} />, label: 'sidebar.attendance', href: '/dashboard/teacher/attendance', submenu: [ { icon: <PlusCircle size={18} />, label: 'sidebar.attendanceNew', href: '/dashboard/teacher/attendance/new' }, { icon: <Calendar size={18} />, label: 'sidebar.attendanceHistory', href: '/dashboard/teacher/attendance/history' }, { icon: <Clock size={18} />, label: 'Devamsızlık Raporu', href: '/dashboard/teacher/attendance/reports' } ] }, { icon: <Users size={20} />, label: 'sidebar.students', href: '/dashboard/teacher/students', submenu: [ { icon: <PlusCircle size={18} />, label: 'sidebar.studentsNew', href: '/dashboard/teacher/students/new' }, { icon: <User size={18} />, label: 'sidebar.studentsList', href: '/dashboard/teacher/students' } ] }, { icon: <Settings size={20} />, label: 'sidebar.settings', href: '/dashboard/teacher/settings', submenu: null } ];

    // --- SidebarItem Bileşeni Güncellemesi ---
    const SidebarItem = ({ icon, label, href, isActive, isExpanded, hasSubmenu, onClick, onPopoverToggle, isPopoverOpen }: SidebarItemProps) => {
        const isCollapsed = !isExpanded && !isMobileMenuOpen;
        const showPopoverCondition = isCollapsed && hasSubmenu;

        const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (hasSubmenu) {
                e.preventDefault(); // Alt menüsü olan öğelerde sayfaya gitmeyi engelle
                if (isMobileMenuOpen) {
                    // Mobil modda normal alt menüyü aç/kapat
                    onClick?.();
                } else if (!isExpanded) {
                    // Dar modda popover'ı aç/kapat
                    onPopoverToggle?.();
                } else {
                    // Geniş modda normal alt menüyü aç/kapat
                    onClick?.();
                }
            } else {
                // Alt menü yoksa direkt linke git ve menüleri kapat
                closeAllMenus();
            }
        };

        // Popover açıkken veya normal alt menü açıkken farklı stil
        const isCurrentlyActiveOrOpen = isActive || (isExpanded && activeSubmenu === href) || (isCollapsed && isPopoverOpen);

        return (
            // Popover'ın göreceli konumlanması için li'ye relative ekle
            <li className="relative">
                <Link
                    href={showPopoverCondition ? '#' : href} // Popover gösterilecekse href'i # yap
                    onClick={handleClick}
                    className={cn(
                        "flex items-center justify-between px-3 py-3 rounded-lg transition-all duration-200 group w-full", // w-full eklendi
                        isCurrentlyActiveOrOpen
                            ? "bg-primary/10 text-primary dark:bg-primary/20" // Aktif/Açık stil
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60",
                         isCollapsed && "justify-center" // Dar modda içeriği ortala
                    )}
                    aria-haspopup={hasSubmenu ? "menu" : undefined}
                    aria-expanded={isPopoverOpen || (isExpanded && activeSubmenu === href)}
                >
                    <div className={cn("flex items-center", isExpanded ? "gap-3" : "gap-0")}>
                        <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-200",
                             isCurrentlyActiveOrOpen ? "text-primary" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                        )}>
                            {icon}
                        </div>
                        {isExpanded && ( // Sadece geniş modda label göster
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                    "text-sm font-medium whitespace-nowrap",
                                    isCurrentlyActiveOrOpen ? "text-primary" : "text-gray-700 dark:text-gray-300"
                                )}
                            >
                                {t(label)}
                            </motion.span>
                        )}
                    </div>
                    {/* Geniş modda alt menü oku */}
                    {hasSubmenu && isExpanded && (
                        <ChevronRight
                            size={16}
                            className={cn(
                                "transition-transform text-gray-400",
                                activeSubmenu === href ? "rotate-90" : "rotate-0"
                            )}
                        />
                    )}
                     {/* Dar modda alt menü varsa küçük bir gösterge (isteğe bağlı) */}
                     {showPopoverCondition && (
                         <span className="absolute bottom-1 right-1 flex h-2 w-2">
                            <span className={cn(
                                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                isPopoverOpen ? "bg-primary" : "bg-gray-400 dark:bg-gray-500"
                            )}></span>
                            <span className={cn(
                                "relative inline-flex rounded-full h-2 w-2",
                                isPopoverOpen ? "bg-primary" : "bg-gray-500 dark:bg-gray-600"
                                )}></span>
                        </span>
                    )}
                </Link>
            </li>
        )
    }

    // --- SubmenuItem Bileşeni Güncellemesi ---
    const SubmenuItem = ({ icon, label, href, isActive, onClick }: SubmenuItemProps) => {
        const handleClick = () => {
            onClick?.(); // Popover kapatma gibi ek işlevleri çağır
            // Navigasyon Link componenti tarafından halledilir
        };
        return (
            <li>
                <Link
                    href={href}
                    onClick={handleClick} // Güncellenmiş handleClick kullanıldı
                    className={cn(
                        "flex items-center pl-3 pr-2 py-2 rounded-lg transition-all duration-200 group w-full text-sm", // w-full ve text-sm eklendi
                        isActive
                            ? "bg-primary/10 text-primary"
                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700/60"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "flex items-center justify-center w-6 h-6 rounded-md",
                            isActive ? "text-primary" : "text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                        )}>
                            {icon}
                        </div>
                        <span className={cn(
                            "font-medium whitespace-nowrap", // text-sm kaldırıldı (üstte eklendi)
                            isActive ? "text-primary" : "text-gray-600 dark:text-gray-400"
                        )}>
                            {t(label)}
                        </span>
                    </div>
                </Link>
            </li>
        )
    }


    // --- Ana JSX Yapısı ---
    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
            {/* Popover açıkken tıklamayı yakalayan overlay (daha basit yöntem) */}
            <AnimatePresence>
                {openPopoverMenu && !isSidebarExpanded && !isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40" // Sidebar'ın arkasında ama diğer içeriğin önünde
                        onClick={() => setOpenPopoverMenu(null)} // Overlay'e tıklayınca kapat
                    />
                )}
            </AnimatePresence>

             {/* Mobil Menü Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                        onClick={toggleMobileMenu}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                ref={sidebarRef} // Dış tıklama algılaması için ref (overlay kullanılıyorsa şart değil)
                initial={false}
                animate={{
                    width: isMobileMenuOpen ? 280 : (isSidebarExpanded ? 280 : 80)
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                    "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-gray-900 transition-width duration-300 ease-in-out shadow-lg lg:shadow-none", // Gölge eklendi
                    !isMobileMenuOpen && "-translate-x-full lg:translate-x-0",
                     // Width sınıfları animate prop'u ile yönetildiği için buradan kaldırılabilir ama yedek olarak kalabilir
                    isMobileMenuOpen ? "w-[280px]" : (isSidebarExpanded ? "lg:w-[280px]" : "lg:w-[80px]"),
                )}
            >
                {/* Sidebar Header */} 
                <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700 flex-shrink-0">
                    {/* FR Logo when collapsed */} 
                    {!isSidebarExpanded && !isMobileMenuOpen && (
                        <Link href="/dashboard/teacher" className="flex items-center justify-center py-4">
                           <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
                             FR
                           </div>
                        </Link>
                    )}
                    {/* Full App Name when expanded or in mobile view */} 
                    {(isSidebarExpanded || isMobileMenuOpen) && (
                        <Link href="/dashboard/teacher" className="flex items-center justify-start py-4 pl-1 pr-2"> {/* Adjusted padding/alignment */} 
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 }}
                                className="flex flex-col items-start leading-tight"
                            >
                                <span className="font-bold text-lg text-gray-800 dark:text-gray-100 truncate">{t('appName.line1')}</span> {/* Added truncate */} 
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 tracking-wide uppercase truncate">{t('appName.line2')}</span> {/* Added truncate */} 
                            </motion.div>
                        </Link>
                    )}
                    <div className="flex-grow"></div>
                    <button onClick={toggleSidebar} className={cn( "hidden lg:flex rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700", isMobileMenuOpen && "hidden" )} title={isSidebarExpanded ? t('sidebar.tooltips.collapse') : t('sidebar.tooltips.expand')} > {isSidebarExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />} </button>
                    {isMobileMenuOpen && ( <button onClick={toggleMobileMenu} className="ml-auto rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden" > <ChevronLeft className="h-5 w-5" /> </button> )}
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
                    <ul className="space-y-1">
                        {sidebarItems.map((item, index) => {
                            const isActive = pathname === item.href || (item.href !== '/dashboard/teacher' && pathname.startsWith(item.href + '/'));
                            const hasSubmenu = item.submenu !== null && item.submenu.length > 0;
                            const isCurrentPopoverOpen = openPopoverMenu === item.href;

                            return (
                                <React.Fragment key={item.href}>
                                    <SidebarItem
                                        icon={item.icon}
                                        label={item.label}
                                        href={item.href}
                                        isActive={isActive}
                                        isExpanded={isSidebarExpanded || isMobileMenuOpen}
                                        hasSubmenu={hasSubmenu}
                                        onClick={() => {
                                            if (isMobileMenuOpen || isSidebarExpanded) {
                                                toggleSubmenu(item.href);
                                            }
                                        }}
                                        onPopoverToggle={() => {
                                            if (!isSidebarExpanded && !isMobileMenuOpen) {
                                                togglePopoverMenu(item.href);
                                            }
                                        }}
                                        isPopoverOpen={isCurrentPopoverOpen}
                                    />

                                    {/* Alt Menü - Hem mobil hem de masaüstü geniş mod için */}
                                    {(isSidebarExpanded || isMobileMenuOpen) && hasSubmenu && (
                                        <AnimatePresence>
                                            {activeSubmenu === item.href && (
                                                <motion.ul
                                                    key={item.href + "-submenu"}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="ml-5 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-4 overflow-hidden"
                                                >
                                                    {item.submenu?.map((subItem, subIndex) => {
                                                        const isSubActive = pathname === subItem.href;
                                                        return (
                                                            <SubmenuItem
                                                                key={subIndex}
                                                                icon={subItem.icon}
                                                                label={subItem.label}
                                                                href={subItem.href}
                                                                isActive={isSubActive}
                                                                onClick={() => {
                                                                    closeAllMenus();
                                                                    if (isMobileMenuOpen) {
                                                                        toggleMobileMenu();
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </motion.ul>
                                            )}
                                        </AnimatePresence>
                                    )}

                                    {/* Dar Modda Popover Alt Menü */}
                                    <AnimatePresence>
                                        {isCurrentPopoverOpen && !isSidebarExpanded && !isMobileMenuOpen && hasSubmenu && (
                                            <motion.div
                                                // ref={popoverRef} // Dış tıklama algılaması için ref (overlay kullanılıyorsa şart değil)
                                                key={item.href + "-popover"}
                                                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                transition={{ duration: 0.2, ease: "easeOut" }}
                                                className={cn(
                                                    "absolute top-0 z-50 p-2 rounded-lg shadow-xl border",
                                                    "bg-white dark:bg-gray-800",
                                                    "border-gray-200 dark:border-gray-700",
                                                    "left-[calc(100%+0.5rem)]", // İkonun sağında boşluk bırakarak başla
                                                    "min-w-[200px]" // Minimum genişlik
                                                )}
                                                // Popover'ın kendi dışına tıklanmasını engellemek için (opsiyonel)
                                                // onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="mb-2 px-2 pt-1">
                                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t(item.label)}</span>
                                                </div>
                                                <ul className="space-y-1">
                                                    {item.submenu?.map((subItem, subIndex) => {
                                                        const isSubActive = pathname === subItem.href;
                                                        return (
                                                            <SubmenuItem
                                                                key={subIndex}
                                                                icon={subItem.icon}
                                                                label={subItem.label}
                                                                href={subItem.href}
                                                                isActive={isSubActive}
                                                                onClick={() => setOpenPopoverMenu(null)} // Popover'ı kapat
                                                            />
                                                        )
                                                    })}
                                                </ul>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            )
                        })}
                    </ul>
                </nav>

                {/* Sidebar Footer (Değişiklik Yok) */}
                 <div className="mt-auto border-t border-gray-200 px-3 py-4 dark:border-gray-700 flex-shrink-0">
                    <button onClick={logout} className={cn( "flex w-full items-center rounded-lg px-3 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors duration-150 group", !isSidebarExpanded && !isMobileMenuOpen && "justify-center" )} title={t('sidebar.tooltips.logout')} > <div className={cn("flex items-center", isSidebarExpanded || isMobileMenuOpen ? "gap-3" : "gap-0")}> <div className="flex h-8 w-8 items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors duration-150"> <LogOut size={20} /> </div> {(isSidebarExpanded || isMobileMenuOpen) && ( <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium whitespace-nowrap" > {t('sidebar.logout')} </motion.span> )} </div> </button>
                </div>
            </motion.aside>

             {/* Ana İçerik Bölümü (Değişiklik Yok) */}
            <div className={cn("flex flex-col flex-1 overflow-y-auto transition-all duration-300 ease-in-out")}>
                {/* Header (Değişiklik Yok) */}
                <header className="sticky top-0 z-30 w-full border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <button onClick={toggleMobileMenu} className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:hidden" aria-label={t('header.tooltips.openMenu')} > <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" /> </button>
                        <div className="flex-1 lg:ml-4"> <span className="hidden md:inline font-semibold text-lg text-gray-800 dark:text-gray-100"> {t('header.greeting', { firstName: user?.first_name, lastName: user?.last_name })} </span> </div>
                        <div className="flex items-center gap-3">
                            {mounted && ( <> <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleLanguage} className="flex items-center gap-2 rounded-full bg-white/50 px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white/70 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800/70" title={t('header.tooltips.changeLanguage')} > {i18n.language === 'tr' ? ( <> <Image src="/images/tr-flag.png" alt={t('language.tr')} width={20} height={20} className={flagSize} /> <span className="hidden sm:inline">{t('language.tr')}</span> </> ) : ( <> <Image src="/images/en-flag.png" alt={t('language.en')} width={20} height={20} className={flagSize} /> <span className="hidden sm:inline">{t('language.en')}</span> </> )} </motion.button> <ThemeToggleButton theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} t={t} /> </> )}
                            <button onClick={logout} className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-red-600 shadow-sm hover:bg-red-50 dark:border-gray-700 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/30" title={t('sidebar.tooltips.logout')} > <LogOut size={20} /> </button>
                        </div>
                    </div>
                </header>
                {/* Main Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {/* Suspense fallback statik metinle güncellendi */}
                    <Suspense fallback={<div>Loading...</div>}>
                        {children}
                    </Suspense>
                </main>
            </div>
        </div>
    )
}