import {
	SourceFile,
	Node,
	ConstructorDeclaration,
	Identifier,
	TypeReferenceNode,
	ClassDeclaration,
	SyntaxKind,
	CallExpression,
	PropertyAccessExpression,
	isPropertyAccessExpression
} from 'typescript';

import { ParserInterface } from './parser.interface';
import { AbstractAstParser } from './abstract-ast.parser';
import { TranslationCollection } from '../utils/translation.collection';

export class ServiceParser extends AbstractAstParser implements ParserInterface {

	protected sourceFile: SourceFile;
	protected serviceIdentifiers: string[] = ["TranslateService.get", "TranslateService.instant", "TranslateService.stream"];
	protected services: string[] = ["TranslateService"];

	public constructor(options?: any) {
		super();
		if (options && typeof options.identifiers !== 'undefined') {
			this.serviceIdentifiers = options.identifiers.split(',');
			this.services = [];
			this.serviceIdentifiers.forEach(identifier => {
				this.services.push(identifier.split('.')[0]);
			 });
		}
	}

	public extract(template: string, path: string): TranslationCollection {
		let collection: TranslationCollection = new TranslationCollection();

		this.sourceFile = this.createSourceFile(path, template);
		const classNodes = this.findClassNodes(this.sourceFile);
		classNodes.forEach(classNode => {
			const constructorNode = this.findConstructorNode(classNode);
			if (!constructorNode) {
				return;
			}

			this.services.forEach(serviceName => {
				const propertyName: string = this.findTranslateServicePropertyName(constructorNode, serviceName);
				if (!propertyName) {
					return;
				}

				let methods: string[] = this.getMethodsForService(serviceName);
				const callNodes = this.findCallNodes(classNode, propertyName, methods);
				callNodes.forEach(callNode => {
					const keys: string[] = this.getStringLiterals(callNode);
					if (keys && keys.length) {
						collection = collection.addKeys(keys);
					}
				});
			});
		});

		return collection;
	}

	protected getMethodsForService(serviceName: string): string[] {
		let methods: string[] = [];

		this.serviceIdentifiers.forEach(identifier => {
			let splitted: string[] = identifier.split('.');
			if (splitted[0] == serviceName) {
				methods.push(splitted[1]);
			}
		});

		return methods;
	}

	/**
	 * Detect what the TranslateService instance property
	 * is called by inspecting constructor arguments
	 */
	protected findTranslateServicePropertyName(constructorNode: ConstructorDeclaration, serviceName: string): string {
		if (!constructorNode) {
			return null;
		}

		const result = constructorNode.parameters.find(parameter => {
			// Skip if visibility modifier is not present (we want it set as an instance property)
			if (!parameter.modifiers) {
				return false;
			}

			// Parameter has no type
			if (!parameter.type) {
				return false;
			}

			// Make sure className is of the correct type
			const parameterType: Identifier = (parameter.type as TypeReferenceNode).typeName as Identifier;
			if (!parameterType) {
				return false;
			}
			const className: string = parameterType.text;
			if (className !== serviceName) {
				return false;
			}

			return true;
		});

		if (result) {
			return (result.name as Identifier).text;
		}
	}

	/**
	 * Find class nodes
	 */
	protected findClassNodes(node: Node): ClassDeclaration[] {
		return this.findNodes(node, [SyntaxKind.ClassDeclaration]) as ClassDeclaration[];
	}

	/**
	 * Find constructor
	 */
	protected findConstructorNode(node: ClassDeclaration): ConstructorDeclaration {
		const constructorNodes = this.findNodes(node, [SyntaxKind.Constructor]) as ConstructorDeclaration[];
		if (constructorNodes) {
			return constructorNodes[0];
		}
	}

	/**
	 * Find all calls to TranslateService methods
	 */
	protected findCallNodes(node: Node, propertyIdentifier: string, methods: string[]): CallExpression[] {
		let callNodes = this.findNodes(node, [SyntaxKind.CallExpression]) as CallExpression[];
		callNodes = callNodes
			.filter(callNode => {
				// Only call expressions with arguments
				if (callNode.arguments.length < 1) {
					return false;
				}

				const propAccess = callNode.getChildAt(0).getChildAt(0) as PropertyAccessExpression;
				if (!propAccess || !isPropertyAccessExpression(propAccess)) {
					return false;
				}
				if (!propAccess.getFirstToken() || propAccess.getFirstToken().kind !== SyntaxKind.ThisKeyword) {
					return false;
				}
				if (propAccess.name.text !== propertyIdentifier) {
					return false;
				}

				const methodAccess = callNode.getChildAt(0) as PropertyAccessExpression;
				if (!methodAccess || methodAccess.kind !== SyntaxKind.PropertyAccessExpression) {
					return false;
				}
				if (!methodAccess.name || methods.indexOf(methodAccess.name.text) ===-1) {
					return false;
				}

				return true;
			});

		return callNodes;
	}

}
