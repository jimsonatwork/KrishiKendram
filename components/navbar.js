const Navbar = (() => {

    function render(title = "KrishiKendram") {

        return `
<header class="kk-navbar">

    <div class="kk-logo">
        🌾 ${title}
    </div>

</header>
`;

    }

    return {
        render
    };

})();