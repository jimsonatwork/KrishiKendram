const RegisterView = () => `

<section class="form-container">

<div class="form-card">

<h2>Create Digital Farmer ID</h2>

<div class="form-grid">

<input
type="text"
id="name"
placeholder="👤 Full Name">

<input
type="tel"
id="mobile"
placeholder="📱 Mobile Number">

<input
type="password"
id="password"
placeholder="🔒 Passphrase">

<input
type="password"
id="confirmPassword"
placeholder="🔒 Confirm Passphrase">

<input
type="tel"
id="alternate"
placeholder="☎ Alternate Number">

<select id="language">

<option>English</option>
<option>తెలుగు</option>
<option>हिन्दी</option>

</select>

<button
class="primary-btn full-width"
id="saveUser">

Create My Farmer ID

</button>

</div>

</div>

</section>

`;