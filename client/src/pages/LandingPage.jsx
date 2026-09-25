import { useEffect } from "react";
function LandingPage({user,sidebarOpen}) {
      useEffect(() => {
    let animationFrame;
    let lastTime = 0;

    const speed = 0.035;

    const autoScroll = (time) => {
      if (!lastTime) {
        lastTime = time;
      }

      const elapsed = time - lastTime;

      if (elapsed > 16) {
        const speed = 0.035;
       
        lastTime = time;
      }

      const reachedBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;

      if (reachedBottom) {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

        lastTime = 0;
      }

      animationFrame = requestAnimationFrame(autoScroll);
    };

    animationFrame = requestAnimationFrame(autoScroll);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, []);
  return (
   <div className={`sandbox-site ${sidebarOpen ? "sidebar-shifted" : ""}`}>

      {/* ================= HEADER ================= */}

      <header className="site-header">
        <div className="site-logo">
          Sandbox
        </div>

        <nav className="site-nav">
          <a href="#platform">Platform</a>
          <a href="#solutions">Solutions</a>
          <a href="#features">Features</a>
          <a href="#companies">For Companies</a>
        </nav>

        <div className="site-header-actions">
          

          <button className="header-demo">
            Get started
          </button>
        </div>
      </header>


      {/* ================= HERO ================= */}

      <section className="sandbox-section sandbox-hero">

        <div className="hero-copy">
          <span className="section-eyebrow">
           WHERE SKILLS BECOME PROOF
          </span>

          <h1>
            Build skills.
            <br />
            <span>Prove them.</span>
          </h1>

          <p>
            A practical platform where learners test their skills through real-world challenges and companies discover people who can actually perform.
          </p>

          <div className="hero-buttons">
            <button className="primary-button">
              Start practicing
            </button>

            <button className="secondary-button">
              For companies 
            </button>
          </div>
        </div>

        <div className="hero-visual">

          <div className="floating-card card-one">
            <span>Frontend</span>
            <strong>React Challenge</strong>
            <small>Completed ✓</small>
          </div>

          <div className="floating-card card-two">
            <span>Backend</span>
            <strong>API Architecture</strong>
            <small>82% score</small>
          </div>

          <div className="floating-card card-three">
            <span>Company</span>
            <strong>New Challenge</strong>
            <small>12 candidates</small>
          </div>

          <div className="hero-orbit" />
        </div>

      </section>


      {/* ================= PLATFORM ================= */}

      <section
        id="platform"
        className="sandbox-section platform-section"
      >

        <div className="section-heading">
          <span className="section-eyebrow">
            ONE PLATFORM
          </span>

          <h2>
            Practice like
            <br />
            <span>the real world.</span>
          </h2>

          <p>
            Sandbox turns coding practice into realistic
            engineering work.
          </p>
        </div>

        <div className="platform-grid">

          <article className="platform-card large-card">
            <div className="card-number">01</div>

            <h3>
              Real engineering challenges
            </h3>

            <p>
              Work on problems that look and feel like
              the work developers face in real teams.
            </p>

            <div className="challenge-preview">
              <div className="preview-top">
                <span>Challenge</span>
                <span>12:42</span>
              </div>

              <div className="preview-line long" />
              <div className="preview-line medium" />
              <div className="preview-line short" />
            </div>
          </article>

          <article className="platform-card">
            <div className="card-number">02</div>

            <h3>
              Prove your ability
            </h3>

            <p>
              Build a track record through completed
              challenges and measurable performance.
            </p>

            <div className="score-circle">
              <strong>87</strong>
              <span>score</span>
            </div>
          </article>

          <article className="platform-card">
            <div className="card-number">03</div>

            <h3>
              Get discovered
            </h3>

            <p>
              Give companies a better signal than a
              resume alone.
            </p>

            <div className="candidate-bars">
              <i />
              <i />
              <i />
              <i />
            </div>
          </article>

        </div>
      </section>


      {/* ================= SOLUTIONS ================= */}

      <section
        id="solutions"
        className="sandbox-section solutions-section"
      >

        <div className="solutions-heading">
          <span className="section-eyebrow">
            FOR BUILDERS
          </span>

          <h2>
            Your skills should
            <br />
            <span>speak for themselves.</span>
          </h2>
        </div>

        <div className="solution-row">

          <div className="solution-number">
            01
          </div>

          <div className="solution-main">
            <h3>
              Practice
            </h3>

            <p>
              Solve practical challenges across frontend,
              backend, cloud and more.
            </p>
          </div>

          <div className="solution-side">
            <span>01</span>
            <strong>Choose a challenge</strong>
          </div>

        </div>

        <div className="solution-row">

          <div className="solution-number">
            02
          </div>

          <div className="solution-main">
            <h3>
              Improve
            </h3>

            <p>
              See your progress and identify the skills
              that need more practice.
            </p>
          </div>

          <div className="solution-side">
            <span>02</span>
            <strong>Build consistency</strong>
          </div>

        </div>

        <div className="solution-row">

          <div className="solution-number">
            03
          </div>

          <div className="solution-main">
            <h3>
              Get noticed
            </h3>

            <p>
              Turn your work into evidence that companies
              can evaluate.
            </p>
          </div>

          <div className="solution-side">
            <span>03</span>
            <strong>Show what you can do</strong>
          </div>

        </div>

      </section>


      {/* ================= FEATURES ================= */}

      <section
        id="features"
        className="sandbox-section features-section"
      >

        <div className="section-heading centered">
          <span className="section-eyebrow">
            BUILT FOR REAL WORK
          </span>

          <h2>
            Everything you need
            <br />
            <span>to keep building.</span>
          </h2>
        </div>

        <div className="feature-grid">

          <article className="feature-item">
            <div className="feature-icon">⌘</div>
            <h3>Challenge library</h3>
            <p>
              Curated engineering problems across
              modern technologies.
            </p>
          </article>

          <article className="feature-item">
            <div className="feature-icon">↗</div>
            <h3>Progress tracking</h3>
            <p>
              Understand how your practical skills are
              developing over time.
            </p>
          </article>

          <article className="feature-item">
            <div className="feature-icon">◎</div>
            <h3>Company challenges</h3>
            <p>
              Practice problems created around real
              engineering requirements.
            </p>
          </article>

          <article className="feature-item">
            <div className="feature-icon">✦</div>
            <h3>Developer profiles</h3>
            <p>
              Build a profile around work you have
              actually completed.
            </p>
          </article>

        </div>

      </section>


      {/* ================= COMPANIES ================= */}

      <section
        id="companies"
        className="sandbox-section company-section"
      >

        <div className="company-copy">

          <span className="section-eyebrow">
            FOR COMPANIES
          </span>

          <h2>
            Stop guessing
            <br />
            <span>who can build.</span>
          </h2>

          <p>
            Give developers realistic challenges and
            evaluate the work they produce.
          </p>

          <button className="primary-button">
            Work with Sandbox →
          </button>

        </div>

        <div className="company-dashboard">

          <div className="dashboard-header">
            <span>Candidate performance</span>
            <span>Today</span>
          </div>

          <div className="dashboard-person">
            <div className="person-avatar">
              A
            </div>

            <div>
              <strong>Alex Morgan</strong>
              <small>Full-stack developer</small>
            </div>

            <b>92%</b>
          </div>

          <div className="dashboard-person">
            <div className="person-avatar">
              R
            </div>

            <div>
              <strong>Riya Shah</strong>
              <small>Frontend developer</small>
            </div>

            <b>88%</b>
          </div>

          <div className="dashboard-person">
            <div className="person-avatar">
              D
            </div>

            <div>
              <strong>Daniel Kim</strong>
              <small>Backend developer</small>
            </div>

            <b>84%</b>
          </div>

        </div>

      </section>


      {/* ================= CTA ================= */}

      <section className="sandbox-section cta-section">

        <div className="cta-box">

          <span className="section-eyebrow">
            READY?
          </span>

          <h2>
            Don't just say
            <br />
            you can code.
            <br />
            <span>Prove it.</span>
          </h2>

          <button className="primary-button">
            Start practicing →
          </button>

        </div>

      </section>


      {/* ================= FOOTER ================= */}

      <footer className="sandbox-footer">

        <div className="footer-brand">
          Sandbox
        </div>

        <div className="footer-links">
          <div>
            <strong>Platform</strong>
            <span>Challenges</span>
            <span>Leaderboard</span>
            <span>Progress</span>
          </div>

          <div>
            <strong>Companies</strong>
            <span>Hire developers</span>
            <span>Challenges</span>
            <span>Contact</span>
          </div>

          <div>
            <strong>Community</strong>
            <span>About</span>
            <span>Blog</span>
            <span>Contact</span>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Sandbox</span>
          <span>Built for developers.</span>
        </div>

      </footer>

    </div>
  );
}

export default LandingPage;