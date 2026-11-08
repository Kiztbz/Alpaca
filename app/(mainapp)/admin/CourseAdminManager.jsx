"use client";

import { useState } from "react";
import styles from "./Superadmin.module.css";

export default function CourseAdminManager({ courses, initialAssignments }) {
  const [courseId, setCourseId] = useState(String(courses[0]?.id || ""));
  const [username, setUsername] = useState("");
  const [assignments, setAssignments] = useState(initialAssignments);
  const [message, setMessage] = useState("");

  async function assign(event) {
    event.preventDefault();
    setMessage("");
    const response = await fetch("/api/admin/course-admins", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, username }),
    });
    const data = await response.json();
    setMessage(data.message);
    if (response.ok) window.location.reload();
  }

  async function remove(item) {
    const response = await fetch("/api/admin/course-admins", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: item.courseId, userId: item.userId }),
    });
    const data = await response.json();
    setMessage(data.message);
    if (response.ok) setAssignments((current) => current.filter((row) => row.courseId !== item.courseId || row.userId !== item.userId));
  }

  return <div>
    <form className={styles.assignForm} onSubmit={assign}>
      <select value={courseId} onChange={(event) => setCourseId(event.target.value)} aria-label="Course">
        {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
      </select>
      <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Account username" required />
      <button className="button primary" type="submit" disabled={!courses.length}>Grant admin</button>
    </form>
    {message && <p className={styles.message}>{message}</p>}
    <div className={styles.assignments}>
      {assignments.map((item) => <div key={`${item.courseId}-${item.userId}`}>
        <span><strong>{item.username}</strong><small>{item.courseName}</small></span>
        <button className="button" onClick={() => remove(item)}>Remove</button>
      </div>)}
      {!assignments.length && <p>No delegated course admins yet.</p>}
    </div>
  </div>;
}
