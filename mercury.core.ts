// Configuration file for Rosilo.
export default {
	Name: "Rosilo",
	Domain: "rosilo.onrender.com", // Update this to your actual Render URL
	DatabaseURL: "http://localhost:8000",
	RCCServiceProxyURL: "http://localhost:64990",
	OrbiterPrivateURL: "http://localhost:64991",
	OrbiterPublicDomain: "localhost:64992",
	LauncherURI: "rosilo-launcher:",
	CurrencySymbol: "R$", // Changed to R$ for Rosilo, or choose your own!
	Pages: ["Statistics", "Forum", "Groups"],

	// 'noob' colours (Keeping these classic or customize as you like)
	DefaultBodyColors: {
		Head: 24,
		LeftArm: 24,
		LeftLeg: 119,
		RightArm: 24,
		RightLeg: 119,
		Torso: 23,
	},

	Logging: {
		Requests: true,
		FormattedErrors: false,
		Time: true,
	},

	Branding: {
		Favicon: "Branding/Favicon.svg",
		Icon: "Branding/Icon.svg",
		Tagline: "The Galaxy of Creation",
		Descriptions: {
			"Endless possibilities":
				"Rosilo is a vast universe where you can create, play, and explore with friends.",
			"Space-Age Performance":
				"Built for speed and security, Rosilo provides a high-performance revival experience.",
			"The Community First":
				"A social platform designed for creators, by creators. Join the Rosilo orbit today.",
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
			Name: "Spacy Purple",
			Path: "Themes/Rosilo.css", // We will create this file next
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
			Prefix: "rosilo-",
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
