import Link from "next/link";

const workflowSteps = [
  {
    label: "Step 1",
    title: "Teacher login",
    description: "Each teacher will access only the classes assigned to them.",
  },
  {
    label: "Step 2",
    title: "Class record",
    description: "Attendance and homework completion will be entered in one flow.",
  },
  {
    label: "Step 3",
    title: "Admin review",
    description: "Submitted records will be available for review and export.",
  },
];

const sprintTasks = [
  {
    title: "Application shell",
    detail: "Create the first runnable Next.js app structure.",
  },
  {
    title: "Setup instructions",
    detail: "Document how to install dependencies and start local development.",
  },
  {
    title: "Environment template",
    detail: "Prepare placeholders for database and authentication settings.",
  },
];

export default function Home() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Class Records Platform</strong>
            <span>ESL school class records</span>
          </div>
          <span className="status-pill">Sprint 1 foundation</span>
        </div>
      </header>

      <div className="main">
        <div className="workspace">
          <section className="intro" aria-labelledby="page-title">
            <p className="eyebrow">Teacher records platform</p>
            <h1 id="page-title">
              Attendance and homework records without paper class sheets.
            </h1>
            <p className="lede">
              This app will help teachers record class information digitally,
              store it safely, and make records easier for admins to review.
            </p>
            <div className="action-row">
              <Link className="primary-link" href="/admin/data">
                View database preview
              </Link>
            </div>

            <div className="workflow" aria-label="Product workflow">
              {workflowSteps.map((step) => (
                <article className="workflow-step" key={step.title}>
                  <span>{step.label}</span>
                  <strong>{step.title}</strong>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="panel" aria-labelledby="sprint-title">
            <h2 id="sprint-title">Current Sprint Tasks</h2>
            <ul className="task-list">
              {sprintTasks.map((task) => (
                <li key={task.title}>
                  <strong>{task.title}</strong>
                  <span>{task.detail}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
