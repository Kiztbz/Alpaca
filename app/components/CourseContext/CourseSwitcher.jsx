"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./CourseSwitcher.module.css";

export function CourseSwitcher({ courses, activeCourse, label = "Course" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <label className={styles.switcher}><span>{label}</span><select value={activeCourse?.publicId || ""} onChange={(event) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("course", event.target.value);
    router.push(`${pathname}?${params.toString()}`);
  }}>{courses.map((course) => <option value={course.publicId} key={course.id}>{course.name}</option>)}</select></label>;
}
