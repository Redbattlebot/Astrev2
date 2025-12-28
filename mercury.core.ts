// Configuration file for Mercury Core. Hover over a property to see its description!
// If you're running in production, you'll need to rebuild Mercury Core to apply changes.

export default {
	Name: "Rosilo",
	Domain: "astrev.onrender.com",
	DatabaseURL: "http://localhost:8000",
	RCCServiceProxyURL: "http://localhost:64990",
	OrbiterPrivateURL: "http://localhost:64991",
	OrbiterPublicDomain: "localhost:64992",
	LauncherURI: "mercury-launcher:",
	CurrencySymbol: "屌",
	Pages: ["Statistics", "Forum", "Groups"],

	// Updated to 'Spacy' Rosilo colors (Deep Purples and Darks)
	DefaultBodyColors: {
		Head: 1031,      // Deep Royal Purple
		LeftArm: 1031,   // Deep Royal Purple
		LeftLeg: 1032,   // Midnight Blue/Purple
		RightArm: 1031,  // Deep Royal Purple
		RightLeg: 1032,  // Midnight Blue/Purple
		Torso: 1030,     // Dark Obsidian
	},

	Logging: {
		Requests: true,
		FormattedErrors: false,
		Time: true,
	},

	Branding: {
		Favicon: "Branding/Favicon.png",
		Icon: "Branding/Icon.png",
		Tagline: "Revival tagline",
		Descriptions: {
			"Endless possibilites":
				"Create or play your favourite games and customise your character with items on our catalog.",
			"New features":
				"In addition to full client usability, additional features such as security fixes, QoL fixes and an easy to use website make your experience better.",
			"Same nostalgia":
				"All of our clients will remain as vanilla as possible, to make sure it's exactly as you remember it.",
		},
	},

	Images: {
		DefaultPlaceIcons: ["Images/DefaultIcon1.avif"],
		DefaultPlaceThumbnails: [
			"Images/DefaultThumbnail1.avif",
			"Images/DefaultThumbnail2.avif",
			"Images/DefaultThumbnail3.avif",
		],
	},

	Themes: [
		{
			Name: "Standard",
			Path: "Themes/Standard.css",
		},
	],

	Filtering: {
		FilteredWords: [],
		ReplaceWith: "#",
		ReplaceType: "Character",
	},

	Registration: {
		Keys: {
			Enabled: true,
			Prefix: "mercurkey-",
		},
		Emails: true,
	},

	Email: {
		Host: "smtp.example.com",
		Port: 587,
		Username: "username",
	},

	Gameservers: {
		Hosting: "Both",
	},
} satisfies import("./Assets/schema.ts").Config
