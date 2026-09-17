import { aboutContent } from "./aboutContent.js";


export function initAboutPanel() {

    const aboutPanel =
        document.getElementById("about-panel");

    const aboutButton =
        document.getElementById("about-button");

    const closeButton =
        document.getElementById("close-about");

    const aboutContentElement =
        document.getElementById("about-content");


    aboutContentElement.innerHTML =
        aboutContent;


    function openAbout() {

        aboutPanel.classList.remove("hidden");

    }


    function closeAbout() {

        aboutPanel.classList.add("hidden");

    }


    aboutButton.addEventListener(
        "click",
        openAbout
    );


    closeButton.addEventListener(
        "click",
        closeAbout
    );

}