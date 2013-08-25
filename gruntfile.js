module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
	uglify: {
		options: {
			// the banner is inserted at the top of the output
			banner: '/*! <%= pkg.title %> v<%= pkg.version %>\n(c) <%= grunt.template.today("yyyy") %> Amey Sakhadeo\n<%= pkg.licenses[0].type %> License: <%= pkg.licenses[0].url %> */\n',
            preserveComments : 'some'
		},
		dist: {
			files: {
			  'dist/jquery.idb.min.js': ['src/**/*.js']
			}
		}
	},
	jshint: {
		files: ['src/**/*.js', 'test/**/*.js'],
		// configure JSHint (documented at http://www.jshint.com/docs/)
		options: {

			globals: {
			  jQuery: true,
			  console: true,
			  module: true
			}
		}
	}

  });

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	//grunt.loadNpmTasks('grunt-contrib-watch');

	//grunt.registerTask('test', ['jshint', 'qunit']);

	grunt.registerTask('default', ['jshint','uglify']);
    grunt.registerTask('build', ['jshint','uglify']);
};
