const Article = require("../models/ArticleModel");
const multer = require("multer");

// Configuration de Multer pour gérer le téléchargement d'images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // Le dossier où les images seront stockées
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Nom unique pour l'image
  },
});
const upload = multer({ storage: storage });

const articleController = {
  getAllArticles: async (req, res) => {
    try {
      const articles = await Article.aggregate([
        {
          $lookup: {
            from: "users", // Le nom de la collection des utilisateurs
            localField: "author",
            foreignField: "_id",
            as: "authorData",
          },
        },
        {
          $unwind: "$authorData", // Dérouler le tableau auteurData pour avoir une seule entrée
        },
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            image: 1,
            author: "$authorData", // Utiliser directement les informations de l'auteur
          },
        },
      ]);

      res.json(articles);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erreur lors de la récupération des articles" });
    }
  },

  getArticleById: async (req, res) => {
    try {
      const article = await Article.findById(req.params.id)
        .populate("author", "username")
        .populate("categories", "name");
      if (!article) {
        return res.status(404).json({ message: "Article non trouvé" });
      }
      res.json(article);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erreur lors de la récupération de l'article" });
    }
  },
  createArticle: async (req, res) => {
    try {
      // Utilisez la méthode `upload.single` ici pour gérer le téléchargement du fichier
      upload.single("image")(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
          return res
            .status(400)
            .json({ message: "Erreur lors du téléchargement du fichier" });
        } else if (err) {
          return res
            .status(500)
            .json({
              message:
                "Une erreur s'est produite lors du téléchargement du fichier",
            });
        }

        const { title, content } = req.body;
        const image = req.file.filename;
        const author = req.auth.userId; // Récupérez l'ID de l'utilisateur à partir du token JWT
        const newArticle = new Article({
          title,
          content,
          image,
          author,
        });
        await newArticle.save();
        res.json(newArticle);
      });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erreur lors de la création de l'article" });
    }
  },

  updateArticle: async (req, res) => {
    try {
      const { title, content, categories, image } = req.body;
      const updatedArticle = await Article.findByIdAndUpdate(
        req.params.id,
        {
          title,
          content,
          categories,
          image,
        },
        { new: true }
      );
      if (!updatedArticle) {
        return res.status(404).json({ message: "Article non trouvé" });
      }
      res.json(updatedArticle);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erreur lors de la mise à jour de l'article" });
    }
  },

  deleteArticle: async (req, res) => {
    try {
      const deletedArticle = await Article.findByIdAndDelete(req.params.id);
      if (!deletedArticle) {
        return res.status(404).json({ message: "Article non trouvé" });
      }
      res.json({ message: "Article supprimé avec succès" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Erreur lors de la suppression de l'article" });
    }
  },
};

module.exports = articleController;