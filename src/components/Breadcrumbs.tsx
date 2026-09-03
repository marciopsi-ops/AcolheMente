import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { motion } from "motion/react";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`w-full max-w-[1440px] px-6 md:px-12 py-3 mt-4 flex items-center ${className}`}
    >
      <motion.ol
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium uppercase tracking-wider text-forest/50 bg-white/40 backdrop-blur-sm border border-soft/50 py-2 px-4 rounded-full shadow-sm w-fit"
      >
        <li className="flex items-center">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "instant" });
              const homeItem = items.find((i) => i.label.toLowerCase() === "início" || i.label.toLowerCase() === "home");
              if (homeItem?.onClick) {
                homeItem.onClick();
              } else if (items[0]?.onClick) {
                items[0].onClick();
              }
            }}
            className="flex items-center gap-1 hover:text-sun-dark transition-colors cursor-pointer"
            title="Início"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Início</span>
          </button>
        </li>

        {items.map((item, index) => {
          // If first is home, we already rendered the icon, but let's check label if it's not home
          if (index === 0 && (item.label.toLowerCase() === "início" || item.label.toLowerCase() === "home")) {
            return null;
          }

          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              <li className="flex items-center text-forest/30" aria-hidden="true">
                <ChevronRight className="w-3 h-3" />
              </li>
              <li className="flex items-center">
                {isLast || !item.onClick ? (
                  <span
                    className={`font-semibold ${
                      item.active || isLast ? "text-forest" : "text-forest/60"
                    }`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                      item.onClick?.();
                    }}
                    className="hover:text-sun-dark transition-colors focus:outline-none cursor-pointer"
                  >
                    {item.label}
                  </button>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </motion.ol>
    </nav>
  );
}
