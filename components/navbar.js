/*
===========================================
KrishiKendram Navbar Component
Version : 1.1.0
===========================================
*/

const Navbar = {

    render(pageTitle = "") {

        return `

<header class="kk-navbar">

    <div class="kk-logo"
         onclick="Router.navigate('home')">

        🌾 <span>KrishiKendram</span>

    </div>

    <div class="kk-page-title">

        ${pageTitle}

    </div>

    <div class="kk-nav-right">

        <button
            class="kk-home-btn"
            onclick="Router.navigate('home')">

            Home

        </button>

    </div>

</header>

`;

    }

};