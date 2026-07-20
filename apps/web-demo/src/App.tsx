import type { FormEvent } from "react";

function preventDemoSubmission(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
}

export function App() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="logo" href="#top" aria-label="Northstar Labs home">
          <span aria-hidden="true">✦</span> Northstar Labs
        </a>
        <span className="demo-badge">Local demo application</span>
      </header>

      <main id="top">
        <section className="job-hero">
          <p className="eyebrow">Engineering · Vancouver, BC · Hybrid</p>
          <h1>Junior Software Engineer</h1>
          <p className="job-summary">
            Help us build thoughtful developer tools that make complex work feel
            simple. You’ll ship product features with a small, supportive team
            and learn across the stack.
          </p>
          <div className="job-meta" aria-label="Role details">
            <span>Full-time</span>
            <span>New graduate</span>
            <span>CAD $72–88k</span>
          </div>
        </section>

        <div className="content-grid">
          <aside aria-labelledby="application-guide-heading">
            <div className="aside-card">
              <p className="eyebrow">Before you begin</p>
              <h2 id="application-guide-heading">Application guide</h2>
              <ol>
                <li>Share your contact and education details.</li>
                <li>Tell us about relevant work and projects.</li>
                <li>Review every answer before applying.</li>
              </ol>
              <p className="privacy-note">
                This fictional form stores and sends no information.
              </p>
            </div>
          </aside>

          <form className="application-form" onSubmit={preventDemoSubmission}>
            <section className="form-section" aria-labelledby="contact-heading">
              <div className="section-heading">
                <span>01</span>
                <div>
                  <p className="eyebrow">About you</p>
                  <h2 id="contact-heading">Contact information</h2>
                </div>
              </div>
              <div className="field-grid two-columns">
                <label>
                  First name <b aria-hidden="true">*</b>
                  <input
                    id="first-name"
                    name="firstName"
                    autoComplete="given-name"
                    required
                  />
                </label>
                <label>
                  Last name <b aria-hidden="true">*</b>
                  <input
                    id="last-name"
                    name="lastName"
                    autoComplete="family-name"
                    required
                  />
                </label>
                <label>
                  Email address <b aria-hidden="true">*</b>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Phone number <b aria-hidden="true">*</b>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                  />
                </label>
                <label>
                  Current city <b aria-hidden="true">*</b>
                  <input
                    id="location"
                    name="location"
                    autoComplete="address-level2"
                    required
                  />
                </label>
                <label>
                  Portfolio or GitHub URL
                  <input
                    id="portfolio"
                    name="portfolio"
                    type="url"
                    placeholder="https://"
                  />
                </label>
              </div>
            </section>

            <section
              className="form-section"
              aria-labelledby="education-heading"
            >
              <div className="section-heading">
                <span>02</span>
                <div>
                  <p className="eyebrow">Your background</p>
                  <h2 id="education-heading">Education and availability</h2>
                </div>
              </div>
              <div className="field-grid two-columns">
                <label>
                  School or university <b aria-hidden="true">*</b>
                  <input id="school" name="school" required />
                </label>
                <label>
                  Degree or program <b aria-hidden="true">*</b>
                  <input id="degree" name="degree" required />
                </label>
                <label>
                  Education start date
                  <input
                    id="education-start-date"
                    name="educationStartDate"
                    type="date"
                  />
                </label>
                <label>
                  Graduation date
                  <input
                    id="graduation-date"
                    name="graduationDate"
                    type="date"
                  />
                </label>
                <label>
                  Earliest start date
                  <input id="start-date" name="startDate" type="date" />
                </label>
                <label>
                  Are you legally authorized to work in Canada?{" "}
                  <b aria-hidden="true">*</b>
                  <select
                    id="work-authorization"
                    name="workAuthorization"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    <option>Yes</option>
                    <option>No</option>
                    <option>Prefer not to say</option>
                  </select>
                </label>
                <label>
                  Will you now or in the future require employment sponsorship?{" "}
                  <b aria-hidden="true">*</b>
                  <select
                    id="sponsorship"
                    name="sponsorship"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    <option>Yes</option>
                    <option>No</option>
                    <option>Prefer not to say</option>
                  </select>
                </label>
                <fieldset>
                  <legend>Are you open to relocating?</legend>
                  <div className="choice-row">
                    <label>
                      <input type="radio" name="relocation" value="yes" /> Yes
                    </label>
                    <label>
                      <input type="radio" name="relocation" value="no" /> No
                    </label>
                  </div>
                </fieldset>
              </div>
            </section>

            <section
              className="form-section"
              aria-labelledby="questions-heading"
            >
              <div className="section-heading">
                <span>03</span>
                <div>
                  <p className="eyebrow">In your words</p>
                  <h2 id="questions-heading">Application questions</h2>
                </div>
              </div>
              <div className="field-grid">
                <label>
                  Why are you interested in this role?{" "}
                  <b aria-hidden="true">*</b>
                  <textarea
                    id="motivation"
                    name="motivation"
                    maxLength={500}
                    required
                  />
                  <small>Maximum 500 characters</small>
                </label>
                <label>
                  Describe a relevant project. <b aria-hidden="true">*</b>
                  <textarea
                    id="project"
                    name="project"
                    maxLength={700}
                    required
                  />
                  <small>Maximum 700 characters</small>
                </label>
                <label>
                  How do you use AI in your development workflow?
                  <textarea
                    id="ai-workflow"
                    name="aiWorkflow"
                    maxLength={500}
                  />
                  <small>Maximum 500 characters</small>
                </label>
                <label>
                  What makes you a strong candidate?
                  <textarea id="strengths" name="strengths" maxLength={500} />
                  <small>Maximum 500 characters</small>
                </label>
              </div>
            </section>

            <section
              className="form-section"
              aria-labelledby="voluntary-heading"
            >
              <div className="section-heading">
                <span>04</span>
                <div>
                  <p className="eyebrow">Optional</p>
                  <h2 id="voluntary-heading">Voluntary information</h2>
                </div>
              </div>
              <p className="section-copy">
                This information is optional and is not considered in hiring
                decisions.
              </p>
              <fieldset>
                <legend>Gender identity</legend>
                <div className="choice-stack">
                  <label>
                    <input type="radio" name="gender" value="woman" /> Woman
                  </label>
                  <label>
                    <input type="radio" name="gender" value="man" /> Man
                  </label>
                  <label>
                    <input type="radio" name="gender" value="nonbinary" />{" "}
                    Non-binary
                  </label>
                  <label>
                    <input type="radio" name="gender" value="decline" /> Prefer
                    not to say
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>Race or ethnicity</legend>
                <div className="choice-stack">
                  <label>
                    <input type="radio" name="race" value="asian" /> Asian
                  </label>
                  <label>
                    <input type="radio" name="race" value="black" /> Black or
                    African American
                  </label>
                  <label>
                    <input type="radio" name="race" value="white" /> White
                  </label>
                  <label>
                    <input type="radio" name="race" value="decline" /> Prefer
                    not to say
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>Disability status</legend>
                <div className="choice-stack">
                  <label>
                    <input type="radio" name="disability" value="yes" /> Yes
                  </label>
                  <label>
                    <input type="radio" name="disability" value="no" /> No
                  </label>
                  <label>
                    <input type="radio" name="disability" value="decline" />
                    Prefer not to say
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>Do you identify as LGBTQ+?</legend>
                <div className="choice-stack">
                  <label>
                    <input type="radio" name="lgbtq" value="yes" /> Yes
                  </label>
                  <label>
                    <input type="radio" name="lgbtq" value="no" /> No
                  </label>
                  <label>
                    <input type="radio" name="lgbtq" value="decline" /> Prefer
                    not to say
                  </label>
                </div>
              </fieldset>
              <fieldset>
                <legend>Veteran or military service status</legend>
                <div className="choice-stack">
                  <label>
                    <input type="radio" name="veteran" value="yes" /> Veteran
                  </label>
                  <label>
                    <input type="radio" name="veteran" value="no" /> Not a
                    veteran
                  </label>
                  <label>
                    <input type="radio" name="veteran" value="decline" />
                    Prefer not to say
                  </label>
                </div>
              </fieldset>
            </section>

            <section
              className="form-section safety-fixture"
              aria-labelledby="security-heading"
            >
              <div>
                <p className="eyebrow">Scanning safety fixture</p>
                <h2 id="security-heading">Applicant portal password</h2>
                <p>
                  This field exists to verify that ApplyProof excludes blocked
                  data types.
                </p>
              </div>
              <label>
                Password
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                />
              </label>
            </section>

            <label className="consent-row">
              <input type="checkbox" name="accuracyConfirmation" required />
              <span>
                I confirm that I reviewed this application and that its
                information is accurate.
              </span>
            </label>

            <div className="submit-row">
              <p>ApplyProof never clicks this button for you.</p>
              <button type="submit">Submit application</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
